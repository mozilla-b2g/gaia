requireApp('calendar/test/unit/helper.js', function() {
  requireLib('responder.js');
  requireLib('timespan.js');
  requireLib('store/event.js');
  requireLib('store/busytime.js');
  requireLib('store/alarm.js');
});

suite('store/busytime', function() {

  var app;
  var subject;
  var db;
  var id = 0;

  function event(start, end) {
    var remote = {};

    if (start)
      remote.startDate = start;

    if (end)
      remote.endDate = end;

    remote.id = ++id;

    var out = Factory('event', {
      remote: remote
    });

    if (!out.remote.end || !out.remote.end.utc) {
      throw new Error('event has no end');
    }

    return out;
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

  function time(event) {
    return event.remote.startDate.valueOf();
  }

  function record(event) {
    var record = subject._eventToRecord(
      event
    );

    return subject._createModel(record);
  }

  setup(function(done) {
    this.timeout(5000);
    id = 0;
    app = testSupport.calendar.app();
    db = app.db;
    subject = db.getStore('Busytime');

    db.open(function(err) {
      assert.ok(!err);
      done();
    });
  });

  teardown(function(done) {
    testSupport.calendar.clearStore(
      subject.db,
      done
    );
  });

  teardown(function() {
    subject.db.close();
  });

  suite('#_removeDependents', function() {

    suite('alarm store deps', function() {
      var alarmStore;
      var busytime;

      function createTrans(done) {
        var trans = subject.db.transaction(
          ['busytimes', 'alarms'], 'readwrite'
        );

        if (done) {
          trans.addEventListener('complete', function() {
            done();
          });
        }
      }

      // create records
      setup(function(done) {
        var trans = createTrans(done);

        alarmStore = subject.db.getStore('Alarm');
        busytime = Factory('busytime', { _id: 'foo' });

        subject.persist(busytime, trans);
        alarmStore.persist({ _id: 1, busytimeId: busytime._id }, trans);
      });

      test('count check', function(done) {
        var pending = 2;
        var alarmCount = 0;
        var busytimeCount = 0;

        function next() {
          if (!(--pending)) {
            done(function() {
              assert.equal(busytimeCount, 1, 'busytime');
              assert.equal(alarmCount, 1, 'alarm');
            });
          }
        }

        subject.count(function(err, value) {
          alarmCount = value;
          next();
        });

        alarmStore.count(function(err, value) {
          busytimeCount = value;
          next();
        });
      });

      test('after delete', function(done) {
        subject.remove(busytime._id, function() {
          alarmStore.count(function(err, value) {
            done(function() {
              assert.equal(value, 0, 'removes alarm');
            });
          });
        });
      });
    });

  });

  suite('#loadSpan', function() {
    var list;
    var span;

    setup(function() {
      list = Object.create(null);
      span = new Calendar.Timespan(
        new Date(2012, 1, 5),
        new Date(2012, 1, 10)
      );
    });

    function add(name, start, end) {
      setup(function(done) {
        var store = subject.db.getStore('Event');
        var item = list[name] = event(start, end);
        store.persist(item, done);
      });
    }

    add('before long', new Date(2011, 1, 1), new Date(2011, 3, 1));
    add('overlap', new Date(2012, 1, 1), new Date(2013, 1, 1));
    add('starts before', new Date(2012, 1, 3), new Date(2012, 1, 6));
    add('during', new Date(2012, 1, 5), new Date(2012, 1, 9));
    add('ends after', new Date(2012, 1, 9), new Date(2012, 1, 11));
    add('after', new Date(2012, 1, 12), new Date(2012, 1, 15));

    var addEvents;
    var results;
    var expectedEventIds;

    function expected(name) {
      expectedEventIds.push(
        list[name]._id
      );
    }

    setup(function(done) {
      addEvents = [];

      // because we just added events
      // we need to remove them from the cache
      subject._setupCache();

      // add listener for event
      subject.on('add time', function(data) {
        addEvents.push(data);
      });

      // build the list of expected
      // busytimes to be returned by their
      // event id
      expectedEventIds = [];

      // order is important we expect them
      // to be sorted by start date
      expected('overlap');
      expected('starts before');
      expected('during');
      expected('ends after');

      // load
      subject.loadSpan(span, function(err, data) {
        if (err) {
          return done(err);
        }
        results = data;

        // wait until next tick for event
        // to fire...
        setTimeout(done, 0, null);
      });
    });

    test('load results', function() {
      // verify correct data is returned;
      var idMap = Object.create(null);

      results.forEach(function(item) {
        var id = item.eventId;
        if (!(id in idMap)) {
          idMap[id] = true;
        }
      });

      var actualIds = Object.keys(idMap);

      assert.deepEqual(
        actualIds,
        expectedEventIds,
        'load event ids'
      );

      assert.deepEqual(
        addEvents,
        results,
        'should fire load event'
      );
    });
  });

  suite('#_createModel', function() {
    var parentEvent;
    var start = new Date(2012, 7, 1);
    var end = new Date(2012, 7, 8);

    setup(function(done) {
      parentEvent = event(start, end);
      app.store('Event').persist(parentEvent, done);
    });

    test('db-round trip', function(done) {
      var record;
      subject.once('add time', function(item) {
        record = item;
      });

      subject.load(function() {
        done(function() {
          assert.deepEqual(record.startDate, start, 'startDate');
          assert.deepEqual(record.endDate, end, 'endDate');
        });
      });
    });
  });

  suite('#addEvent', function(done) {
    var eventModel;
    var expected;

    setup(function() {
      eventModel = event(new Date(2012, 1, 1));
      expected = [];

      expected.push(
        record(eventModel)
      );

      subject.addEvent(eventModel, done);
    });

    test('result', function(done) {
      var items = [];

      subject._setupCache();
      subject.on('add time', function(item) {
        items.push(item);
      });

      subject.load(function(err, results) {
        done(function() {
          assert.deepEqual(items, expected);
        });
      });
    });
  });

  suite('#removeEvent', function() {
    var removeModel;
    var keepModel;

    setup(function() {
      removeModel = event(new Date(2012, 1, 1));
      keepModel = event(new Date(2013, 1, 1));
    });

    setup(function(done) {
      subject.addEvent(keepModel, done);
    });

    setup(function(done) {
      subject.addEvent(removeModel, done);
    });

    setup(function(done) {
      subject.removeEvent(removeModel._id, done);
    });

    test('removal', function(done) {
      // just load everything...
      var span = new Calendar.Timespan(
        new Date(2012, 1, 1),
        new Date(2015, 1, 1)
      );

      // quick sanity check to make sure
      // we removed in memory stuff
      subject._setupCache();
      subject.loadSpan(span, function(err, results) {
        done(function() {
          assert.equal(results.length, 1);
          var result = results[0];
          assert.equal(result.eventId, keepModel._id);
        });
      });
    });

  });

  suite('memory caching ops', function() {
    var single;
    var recurring;
    var events = {};

    setup(function() {
      events = { remove: [], add: [] };
      var span = new Calendar.Timespan(
        new Date(2010, 1, 1),
        new Date(2015, 1, 1)
      );

      var handler = {
        handleEvent: function(e) {
          switch (e.type) {
            case 'add time':
              events.add.push(e);
              break;
            case 'remove time':
              events.remove.push(e);
              break;
          }
        }
      };

      subject.on('add time', handler);
      subject.on('remove time', handler);

      single = event(new Date(2012, 1, 1));
      recurring = event(new Date(2011, 12, 3));

      subject.addEvent(single);
      subject.addEvent(recurring);

      assert.ok(subject._byEventId[single._id], 'has byEventId');
    });


    suite('#_removeEventTimes', function() {

      test('remove single', function() {
        var item = subject._byEventId[single._id][0];

        subject._removeEventTimes(single._id);

        assert.equal(events.remove.length, 1);

        assert.hasProperties(
          events.remove[0].data[0],
          record(single)
        );

        assert.ok(
          subject._byEventId[recurring._id]
        );

        assert.ok(
          !subject._byEventId[single._id]
        );

      });

      test('remove recurring', function() {
        var removedItems = subject._byEventId[recurring._id];

        subject._removeEventTimes(recurring._id);
        assert.equal(events.remove.length, 1);

        assert.ok(
          !subject._byEventId[recurring._id]
        );

        assert.ok(
          subject._byEventId[single._id]
        );

      });

    });
  });

  test('#_eventToRecord', function() {
    var item = event(new Date(2012, 1, 1));

    var result = subject._eventToRecord(
      item
    );

    assert.deepEqual(
      result.start,
      item.remote.start
    );

    assert.deepEqual(
      result.end,
      item.remote.end
    );

    assert.equal(
      result.eventId,
      item._id
    );

    assert.equal(
      result.calendarId,
      item.calendarId
    );
  });

  suite('#load', function() {
    function add(date) {
      setup(function(done) {
        var item = Factory('event', {
          remote: { startDate: date }
        });

        var store = subject.db.getStore('Event');
        store.persist(item, done);
      });
    }

    add(new Date(2012, 1, 1));
    add(new Date(2012, 1, 5));
    add(new Date(2012, 1, 10));

    setup(function(done) {
      subject._setupCache();
      subject.load(done);
    });

    test('load cache', function() {
      assert.equal(Object.keys(subject._byEventId).length, 3);
    });

  });

});
