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
    if (typeof(date) === 'undefined') {
      date = new Date();
    }

    return Factory('event', {
      remote: { startDate: date, _id: ++id }
    });
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

  suite('#findByIds', function() {
    var events = {};
    var expectedDbIds;
    var expectedCachedIds;

    function persist() {
      setup(function(done) {
        var item = event();
        events[item._id] = item;
        subject.persist(item, done);
      });

    }

    persist();
    persist();

    setup(function() {
      expectedDbIds = Object.keys(subject._cached);
      // clear cache so we can
      // see that events can come from
      // both the db and the cache.
      subject._cached = Object.create(null);
    });

    persist();
    persist();

    test('find from both db and cache', function(done) {
      assert.equal(
        Object.keys(subject.cached).length,
        2,
        'should only have cached items'
      );

      var ids = Object.keys(events);
      var expectedCachedIds = Object.keys(
        subject.cached
      );

      assert.equal(expectedDbIds.length, 2);
      assert.equal(expectedCachedIds.length, 2);

      ids.push('random-not-here');

      subject.findByIds(ids, function(err, items) {
        done(function() {
          assert.equal(
            Object.keys(items).length,
            4,
            'should find all items'
          );

          // check db backed items
          expectedDbIds.forEach(function(id) {
            assert.notEqual(
              items[id],
              events[id],
              'should *not* be cached: ' + id
            );

            assert.deepEqual(
              items[id],
              events[id],
              'should be the same data as cached: ' + id
            );
          });

          // check cache backed items
          expectedCachedIds.forEach(function(id) {
            assert.equal(
              items[id],
              events[id],
              'should be cached! ' + id
            );
          });
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
