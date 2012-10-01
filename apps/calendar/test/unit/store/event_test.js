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

  suite('#findByAssociated', function() {

    var busyStore;
    var events = {};

    setup(function() {
      busyStore = subject.db.getStore('Busytime');

      events.oneIn = Factory('event', {
        remote: {
          startDate: new Date(2012, 1, 1),
          endDate: new Date(2012, 1, 10)
        }
      });

      events.twoIn = Factory('event', {
        remote: {
          startDate: new Date(2012, 1, 7),
          endDate: new Date(2012, 1, 9)
        }
      });
    });

    setup(function(done) {
      subject.persist(events.oneIn, done);
    });

    setup(function(done) {
      subject.persist(events.twoIn, done);
    });

    var records;
    var span;

    setup(function(done) {
      span = new Calendar.Timespan(
        new Date(2012, 1, 5),
        new Date(2012, 1, 11)
      );

      busyStore.loadSpan(span, function(err, list) {
        records = list;
        done();
      });
    });

    test('result', function(done) {

      subject.findByAssociated(records, function(err, list) {

        function hasEvent(idx, event, msg) {
          var record = list[idx];
          assert.deepEqual(
            record[0].startDate,
            events[event].remote.startDate,
            idx + ' - ' + event + ': ' + msg
          );

          assert.deepEqual(
            record[1],
            events[event],
            idx + ' - ' + event + ': ' + msg
          );
        }

        done(function() {
          assert.equal(list.length, 2);

          hasEvent(0, 'oneIn', 'first date in range');
          hasEvent(1, 'twoIn', 'second date in range');
        });
      });
    });

  });

  suite('#remove', function() {

    //TODO: busytime removal tests?

    suite('parent items /w children', function() {
      var id = 'parentStuff';

      setup(function(done) {
        var item = Factory('event', {
          _id: id
        });
        subject.persist(item, done);
      });

      setup(function(done) {
        subject.persist(
          Factory('event', { parentId: id }),
          done
        );
      });

      setup(function(done) {
        subject.remove(id, done);
      });

      test('after remove', function(done) {
        // clear cache
        subject._cached = Object.create(null);

        subject.load(function(data) {
          var keys = Object.keys(subject.cached);
          assert.length(keys, 0);
          done();
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

    setup(function() {
      busytime = subject.db.getStore('Busytime');
      assert.equal(
        Object.keys(subject.cached).length, 3,
        'should have some controls'
      );
    });

    test('removed all events for 1', function(done) {
      subject.removeByIndex('calendarId', 1, function() {
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
          !busytime._byEventId[byCalendar[1][0]],
          'should remove events from busytime'
        );

        assert.ok(
          !busytime._byEventId[byCalendar[1][1]],
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

  suite('creation of dependancies', function() {
    suite('busytime', function() {
      var event;
      setup(function() {
      });
    });
  });


});
