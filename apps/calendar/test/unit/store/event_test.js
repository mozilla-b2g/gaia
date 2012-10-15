requireApp('calendar/test/unit/helper.js', function() {
  requireLib('timespan.js');
  requireLib('interval_tree.js');
  requireLib('responder.js');
  requireLib('calc.js');
  requireLib('store/event.js');

  requireApp('models/account.js');
  requireApp('models/calendar.js');
});

suite('store/event', function() {
  var subject;
  var db;
  var app;
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
    app = testSupport.calendar.app();
    db = app.db;
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
    var input = Factory.build('event');
    var output = subject._createModel(input, 1);
    assert.equal(output._id, 1);
    assert.equal(output.name, output.name);

    assert.deepEqual(
      output.remote.startDate,
      Calendar.Calc.dateFromTransport(
        output.remote.start
      ),
      'startDate'
    );

    assert.deepEqual(
      output.remote.endDate,
      Calendar.Calc.dateFromTransport(
        output.remote.end
      ),
      'endDate'
    );
  });

  suite('#(x)For', function() {
    var calStore;
    var accStore;

    var event;
    var account;
    var calendar;

    setup(function() {
      calStore = db.getStore('Calendar');
      accStore = db.getStore('Account');

      account = { _id: 'foo', providerType: 'Abstract' };
      calendar = { _id: 'foo', accountId: 'foo' };
      event = { calendarId: 'foo' };

      calStore.cached.foo = calendar;
      accStore.cached.foo = account;
    });

    test('#calendarFor', function() {
      assert.equal(
        subject.calendarFor(event),
        calendar
      );
    });

    test('#providerFor', function() {
      assert.equal(
        subject.providerFor(event),
        Calendar.App.provider('Abstract')
      );
    });

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

    function persist() {
      setup(function(done) {
        var item = event();
        events[item._id] = item;
        subject.persist(item, done);
      });

    }

    persist();
    persist();
    persist();
    persist();

    test('result', function(done) {
      var ids = Object.keys(events);
      ids.push('random-not-here');

      subject.findByIds(ids, function(err, items) {
        done(function() {
          assert.equal(
            Object.keys(items).length,
            4,
            'should find all items'
          );

          for (var id in events) {
            assert.deepEqual(
              items[id],
              events[id],
              'should find event with id ' + id
            );
          }
        });
      });
    });

  });

  suite('#remove', function() {

    //TODO: busytime removal tests?

    suite('parent items /w children', function() {
      var parentId = 'parentStuff';
      var childId = 'child';

      setup(function(done) {
        var item = Factory('event', {
          _id: parentId
        });

        subject.persist(item, done);
      });

      setup(function(done) {
        subject.persist(
          Factory('event', { _id: childId, parentId: id }),
          done
        );
      });

      setup(function(done) {
        subject.remove(id, done);
      });

      test('removes parent event', function(done) {
        subject.get(parentId, function() {
          done(function(err, result) {
            assert.ok(!err);
            assert.ok(!result);
          });
        });
      });

      test('removes child event', function(done) {
        subject.get(childId, function() {
          done(function(err, result) {
            assert.ok(!err);
            assert.ok(!result);
          });
        });
      });
    });
  });

  suite('#removeByIndex', function() {
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

    setup(function(done) {
      busytime = subject.db.getStore('Busytime');
      subject.get(byCalendar[2][0], function(err, result) {
        done(function() {
          assert.ok(result, 'has control event');
        });
      });
    });

    test('removed all events for 1', function(done) {
      subject.removeByIndex('calendarId', 1, function() {
        assert.ok(
          !busytime._byEventId[byCalendar[1][0]],
          'should remove events from busytime'
        );

        assert.ok(
          !busytime._byEventId[byCalendar[1][1]],
          'should remove events from busytime'
        );

        subject.get(byCalendar[2][0], function(err, result) {
          done(function() {
            assert.ok(!err);
            assert.ok(result, 'should not remove control');
          });
        });
      });
    });
  });

  suite('creation of dependancies', function() {
    suite('busytime', function() {
      var event;
      setup(function() {
      });
    });
  });


});
