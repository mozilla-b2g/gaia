requireLib('responder.js');
requireLib('timespan.js');
requireLib('store/event.js');
requireLib('store/busytime.js');
requireLib('store/alarm.js');

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
          busytimeCount = value;
          next();
        });

        alarmStore.count(function(err, value) {
          alarmCount = value;
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
        var item = list[name] = Factory('busytime', {
          startDate: start,
          endDate: end
        });

        delete item.startDate;
        delete item.endDate;

        subject.persist(item, done);
      });
    }

    add('before long', new Date(2011, 1, 1), new Date(2011, 3, 1));
    add('overlap', new Date(2012, 1, 1), new Date(2013, 1, 1));
    add('starts before', new Date(2012, 1, 3), new Date(2012, 1, 6));
    add('during', new Date(2012, 1, 5), new Date(2012, 1, 9));
    add('ends after', new Date(2012, 1, 9), new Date(2012, 1, 11));
    add('after', new Date(2012, 1, 12), new Date(2012, 1, 15));

    var results;
    var expectedIds;

    function expected(name) {
      expectedIds.push(
        list[name]._id
      );
    }

    setup(function(done) {
      // because we just added events
      // we need to remove them from the cache
      subject._setupCache();

      // build the list of expected
      // busytimes to be returned by their
      // event id
      expectedIds = [];

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
        // verify startDate/endDate is present
        var model = JSON.parse(JSON.stringify(item));
        model = subject.initRecord(model);

        assert.hasProperties(
          item,
          model,
          'is model'
        );

        var id = item._id;
        if (!(id in idMap)) {
          idMap[id] = true;
        }
      });

      var actualIds = Object.keys(idMap);

      assert.deepEqual(
        actualIds,
        expectedIds,
        'load event ids'
      );
    });
  });

  suite('#_createModel', function() {
    var start = new Date(2012, 7, 1);
    var end = new Date(2012, 7, 8);
    var busy;

    setup(function(done) {
      busy = Factory('busytime', {
        startDate: start,
        endDate: end
      });

      subject.persist(busy, done);
    });

    test('db-round trip', function(done) {
      subject.get(busy._id, function(err, record) {
        done(function() {
          assert.deepEqual(record.startDate, start, 'startDate');
          assert.deepEqual(record.endDate, end, 'endDate');
        });
      });
    });
  });

  suite('#removeEvent', function() {
    var remove;
    var keep;
    var removeEvents = [];

    setup(function(done) {
      removeEvents.length = 0;
      var trans = subject.db.transaction(
        'busytimes', 'readwrite'
      );

      remove = Factory('busytime', {
        eventId: 'remove'
      });

      keep = Factory('busytime', {
        eventId: 'keep'
      });

      subject.persist(remove, trans);
      subject.persist(keep, trans);

      trans.oncomplete = function() {
        done();
      };
    });

    setup(function(done) {
      subject.on('remove', function(id) {
        removeEvents.push(id);
      });

      subject.removeEvent('remove', done);
    });

    test('removed busytime', function(done) {
      assert.deepEqual(
        removeEvents,
        [remove._id]
      );

      subject.get(remove._id, function(err, record) {
        done(function() {
          assert.ok(!record);
        });
      });
    });

    test('control - kept busytime', function(done) {
      subject.get(keep._id, function(err, record) {
        done(function() {
          assert.ok(record);
        });
      });
    });
  });
});
