requireApp('calendar/test/unit/helper.js', function() {
  requireLib('timespan.js');
  requireLib('responder.js');
  requireLib('calc.js');
  requireLib('store/event.js');
});

suite('store/event', function() {
  var subject;
  var db;
  var id = 0;

  function event(date) {
    return Factory('event', {
      remote: { startDate: date, _id: ++id }
    });
  }

  function eventRecuring(date) {
    return Factory('event.recurring', {
      remote: {
        startDate: date,
        _id: ++id,
        _recurres: 1
      }
    });
  }

  function time(event, idx) {
    if (typeof(idx) === 'undefined') {
      idx = 0;
    }

    return event.remote.occurs[idx].valueOf();
  }

  setup(function(done) {
    this.timeout(5000);
    id = 0;
    db = testSupport.calendar.db();
    subject = db.getStore('Event');

    db.open(function(err) {
      assert.ok(!err);
      done();
    });
  });

  teardown(function(done) {
    var trans = db.transaction('events', 'readwrite');
    var accounts = trans.objectStore('events');
    var res = accounts.clear();

    res.onerror = function() {
      done(new Error('could not wipe events db'));
    }

    res.onsuccess = function() {
      done();
    }
  });

  teardown(function(done) {
    var trans = db.transaction('busytimes', 'readwrite');
    var accounts = trans.objectStore('busytimes');
    var res = accounts.clear();

    res.onerror = function() {
      done(new Error('could not wipe busytimes db'));
    }

    res.onsuccess = function() {
      done();
    }
  });

  teardown(function() {
    db.close();
  });

  test('initialization', function() {
    assert.instanceOf(subject, Calendar.Store.Abstract);
    assert.equal(subject._store, 'events');
    assert.equal(subject.db, db);
  });

  test('#_createModel', function() {
    var input = { name: 'foo'};
    var output = subject._createModel(input, 1);
    assert.equal(output._id, 1);
    assert.equal(output.name, output.name);
  });

  suite('#eventsForCalendar', function() {
    var inCal;
    var outCal;

    setup(function(done) {
      inCal = Factory('event', {
        calendarId: 1
      });

      subject.persist(inCal, done);
    });

    setup(function(done) {
      outCal = Factory('event', {
        calendarId: 2
      });

      subject.persist(outCal, done);
    });

    test('result', function(done) {
      subject.eventsForCalendar(1, function(err, result) {
        done(function() {
          assert.ok(!err);
          assert.deepEqual(
            result,
            [inCal]
          );
        });
      });
    });

  });

  suite('#removeByCalendarId', function() {
    var busytime;
    var byCalendar = {};

    setup(function() {
      byCalendar = {};
    });

    function persistEvent(calendarId) {
      setup(function(done) {
        var event = Factory('event', {
          calendarId: calendarId
        });

        if (!(calendarId in byCalendar)) {
          byCalendar[calendarId] = [];
        }

        byCalendar[calendarId].push(event._id);
        subject.persist(event, done);
      });
    }

    persistEvent(1);
    persistEvent(1);
    persistEvent(2);

    setup(function() {
      busytime = subject.db.getStore('Busytime');
      assert.equal(
        Object.keys(subject.cached).length, 3,
        'should have some controls'
      );
    });

    test('removed all events for 1', function(done) {
      subject.removeByCalendarId(1, function() {
        var keys = Object.keys(subject.cached);
        assert.equal(
          keys.length, 1,
          'should have removed all but control'
        );

        assert.equal(
          subject.cached[keys[0]].calendarId,
          2,
          'should not have removed control calendar'
        );

        assert.ok(
          !busytime._eventTimes[byCalendar[1][0]],
          'should remove events from busytime'
        );

        assert.ok(
          !busytime._eventTimes[byCalendar[1][1]],
          'should remove events from busytime'
        );

        subject._cached = {};
        subject.load(function(err, result) {
          done(function() {
            var loadKeys = Object.keys(result);
            assert.equal(loadKeys.length, 1);
            var obj = result[loadKeys[0]];
            assert.equal(obj.calendarId, 2);
          });
        });
      });
    });
  });


});
