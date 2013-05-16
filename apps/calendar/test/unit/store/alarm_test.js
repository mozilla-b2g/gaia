requireLib('calc.js');
requireLib('db.js');
requireLib('store/abstract.js');
requireLib('store/alarm.js');

suite('store/alarm', function() {

  var subject;
  var db;
  var app;
  var controller;


  setup(function(done) {
    this.timeout(5000);
    app = testSupport.calendar.app();
    db = app.db;
    controller = app.alarmController;
    subject = db.getStore('Alarm');

    db.open(function(err) {
      assert.ok(!err);
      done();
    });
  });

  teardown(function(done) {
    testSupport.calendar.clearStore(
      subject.db,
      ['alarms'],
      done
    );
  });

  teardown(function() {
    db.close();
  });

  suite('#findAllByBusytimeId', function() {
    suite('existing', function() {
      var alarms;
      var busytimeId = 'xfoo';
      var busytime = {
        _id: busytimeId
      };

      setup(function(done) {
        alarms = [];
        var trans = db.transaction('alarms', 'readwrite');

        for (var i = 0; i < 3; i++) {
          var alarm = Factory('alarm', { busytimeId: busytimeId });
          alarms.push(alarm);
          subject.persist(alarm, trans);
        }

        trans.oncomplete = function() {
          done();
        };

        trans.onerror = function(e) {
          done(e.target.error);
        };
      });

      test('result', function(done) {
        subject.findAllByBusytimeId(busytime._id, function(err, result) {
          done(function() {
            assert.ok(!err);
            assert.equal(result.length, alarms.length);
          });
        });
      });
    });

    /*
      Error: expected false to be truthy (for the second assert)

      this works when executing only this file but not when executing all
      calendar tests.

      Disabled in Bug 838993, to be enabled asap in Bug 840489

    test('missing', function(done) {
      subject.findAllByBusytimeId('foo', function(err, result) {
        try {
          assert.ok(!err);
          assert.ok(!result);
          done();
        } catch (e) {
          done(e);
        }
      });
    });
    */
  });

  suite('#_objectData', function() {
    var alarm;
    var time = new Date(2018, 0, 1);

    setup(function(done) {
      alarm = Factory('alarm', { _id: 'a1', startDate: time });
      subject.persist(alarm, done);
    });

    test('get', function(done) {
      subject.get('a1', function(err, result) {
        done(function() {
          assert.ok(result.startDate);
          assert.deepEqual(
            result.trigger,
            result.startDate,
            'pending trigger should be same date as trigger'
          );
        });
      });
    });
  });

  suite('#_addDependents', function() {
    var worksQueue = 0;

    setup(function() {
      worksQueue = 0;
      subject.autoQueue = true;
      subject.workQueue = function() {
        worksQueue++;
      };
    });

    test('after persist transaction', function(done) {
      var trans = subject.db.transaction('alarms', 'readwrite');

      subject.persist({}, trans);
      subject.persist({}, trans);
      subject.persist({}, trans);
      subject.persist({}, trans);

      trans.addEventListener('complete', function() {
        done(function() {
          assert.equal(worksQueue, 1);
        });
      });
    });
  });

  test('initialization', function() {
    assert.instanceOf(subject, Calendar.Store.Abstract);
    assert.equal(subject.db, db);
    assert.deepEqual(subject._cached, {});
  });

  function add(date, busytime, event, floating) {
    setup(function(done) {
      var record = Factory('alarm', {
        startDate: date,
        busytimeId: busytime || 'busyId',
        eventId: event || 'eventId'
      });

      if (floating) {
        record.startDate.offset = 0;
        record.startDate.tzid = Calendar.Calc.FLOATING;
      }

      subject.persist(record, done);
    });
  }

  function getAll(cb) {
    var trans = subject.db.transaction('alarms');
    var store = trans.objectStore('alarms');

    store.mozGetAll().onsuccess = function(e) {
      cb(e.target.result);
    };

    store.mozGetAll().onerror = cb;
  }

  suite('#workQueue', function() {
    var getAllResults = [];
    var added = [];
    var lastId = 0;

    var now = new Date(2018, 0, 1);
    var realApi;
    var mockApi = {

      getAll: function() {
        var req = new Calendar.Responder();

        setTimeout(function() {
          req.result = getAllResults.concat([]);
          var event = {
            target: req
          };

          if (req.onsuccess)
            req.onsuccess(event);

          req.emit('success', event);

        }, 1);

        return req;
      },

      add: function(date, tz, data) {
        added.push(Array.prototype.slice.call(arguments));
        var req = new Calendar.Responder();

        setTimeout(function() {
          var id = lastId++;

          if (req.onsuccess)
            req.onsuccess(lastId);

          req.emit('success', lastId);

        }, 1);

        return req;
      }
    };

    suiteSetup(function() {
      realApi = navigator.mozAlarms;
    });

    suiteTeardown(function() {
      navigator.mozAlarms = realApi;
    });

    var handleAlarm;

    setup(function() {
      handleAlarm = null;
      added.length = 0;
      getAllResults.length = 0;
      navigator.mozAlarms = mockApi;

      controller.handleAlarm = function() {
        handleAlarm = arguments;
      };
    });

    suite('without alarm api', function() {
      test('should silently stop', function(done) {
        navigator.mozAlarms = null;
        subject.workQueue(function() {
          done();
        });
      });
    });

    suite('alarm in the past', function() {
      var now = new Date();
      now.setMilliseconds(-1);

      add(now, 'busyMe');

      setup(function(done) {
        subject.workQueue(done);
      });

      test('passing alarm directly to controller', function() {
        var alarm = handleAlarm[0];

        // verify right alarm is sent
        assert.equal(alarm.busytimeId, 'busyMe');
      });
    });

    suite('alarm in db and no alarm with 48 hours', function() {
      add(new Date(2018, 0, 3), 3);

      setup(function(done) {
        getAllResults.push({
          data: Factory('alarm', {
            trigger: new Date(),
            eventId: 'xx'
          })
        });

        subject.workQueue(now, done);
      });

      test('after', function() {
        assert.length(added, 0);
      });
    });

    suite('unrelated alarm in db', function() {
      add(new Date(2018, 0, 3), 3);

      setup(function(done) {
        getAllResults.push({
          data: { _randomField: true }
        });
        subject.workQueue(now, done);
      });

      test('after complete', function() {
        assert.length(added, 1);

        assert.deepEqual(
          added[0][0],
          new Date(2018, 0, 3)
        );
      });

    });

    suite('no alarm in db and no alarm within 48 hours', function() {
      add(new Date(2018, 0, 3), 3);

      setup(function(done) {
        subject.workQueue(now, done);
      });

      test('after complete', function() {
        assert.length(added, 1);

        assert.deepEqual(
          added[0][0],
          new Date(2018, 0, 3)
        );
      });

    });

    suite('initial add', function() {
      // 5 hours from now floating time
      add(new Date(2018, 0, 1, 5), 1, 1, true);

      // 23 hours from now
      add(new Date(2018, 0, 1, 23), 2);

      // over 48 hours from now (yes this works)
      // this record should be skipped and left
      // in the database.
      add(new Date(2018, 0, 3), 3);

      setup(function(done) {
        subject.workQueue(now, done);
      });

      /*
        was disabled by Bug 838993
        to be reenabled by Bug 840489

        Error: has record: expected [ { _id: 1, busytimeId: 'foo' },
      { startDate: { utc: 1514782800000, offset: 0, tzid: 'floating' },
        busytimeId: 1,
        eventId: 1,
        _id: 40 },
      { startDate: { utc: 1514847600000, offset: 3600000 },
        busytimeId: 2,
        eventId: 'eventId',
        _id: 41 },
      { startDate: { utc: 1514937600000, offset: 3600000 },
        busytimeId: 3,
        eventId: 'eventId',
        trigger: { utc: 1514937600000, offset: 3600000 },
        _id: 42 } ] to have a length of 3 but got 4

        note: this works when running only this file, but not when we run the
        whole calendar tests

      test('alarms', function(done) {
        getAll(function(records) {
          done(function() {
            assert.length(records, 3, 'has record');
            var hasTrigger = records.filter(function(item) {
              return 'trigger' in item;
            });
            assert.length(hasTrigger, 1);
            assert.equal(hasTrigger[0].busytimeId, 3);
          });
        });
      });
      */

      test('after complete', function() {
        assert.length(added, 2);

        assert.deepEqual(added[0][0], new Date(2018, 0, 1, 5));
        assert.equal(
          added[0][1], 'ignoreTimezone', 'floating time ignoreTimezone'
        );

        assert.hasProperties(added[0][2], {
          busytimeId: 1
        });

        assert.deepEqual(added[1][0], new Date(2018, 0, 1, 23), 'abs trigger');
        assert.equal(added[1][1], 'honorTimezone', 'abs time honorTimezone');
        assert.hasProperties(added[1][2], {
          busytimeId: 2
        });
      });

    /*
      Error: expected 4 to equal 3

      this works when executing only this file but not when executing all
      calendar tests.

      Disabled in Bug 838993, to be enabled asap in Bug 840489

      test('second work queue', function(done) {
        added.length = 0;
        subject.workQueue(function() {
          // verify add
          assert.equal(added[0][2].busytimeId, 3);

          // verify we didn't delete the records
          subject.count(function(err, len) {
            done(function() {
              assert.equal(len, 3);
            });
          });
        });
      });
    */

    });

  });

});
