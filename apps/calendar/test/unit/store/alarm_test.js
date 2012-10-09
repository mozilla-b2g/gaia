requireApp('calendar/test/unit/helper.js', function() {
  requireLib('calc.js');
  requireLib('db.js');
  requireLib('store/abstract.js');
  requireLib('store/alarm.js');
});

suite('store/alarm', function() {

  var subject;
  var db;
  var app;

  setup(function(done) {
    this.timeout(5000);
    app = testSupport.calendar.app();
    db = testSupport.calendar.db();
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

  suite('#findByBusytimeId', function() {
    suite('existing', function() {
      var alarm;
      var busytimeId = 'xfoo';

      setup(function(done) {
        alarm = Factory('alarm', {
          busytimeId: busytimeId
        });

        subject.persist(alarm, done);
      });

      test('result', function(done) {
        subject.findByBusytimeId(busytimeId, function(err, result) {
          done(function() {
            assert.ok(!err);
            assert.deepEqual(result, alarm);
          });
        });
      });
    });

    test('missing', function(done) {
      subject.findByBusytimeId('foo', function(err, result) {
        assert.ok(!err);
        assert.ok(!result);
        done();
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
      }
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
        trigger: date,
        busytimeId: busytime || 'busyId',
        eventId: event || 'eventId'
      });

      if (floating) {
        record.trigger.offset = 0;
        record.trigger.tzid = Calendar.Calc.FLOATING;
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

    var now = new Date(2012, 0, 1);
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

    setup(function() {
      added.length = 0;
      getAllResults.length = 0;
      navigator.mozAlarms = mockApi;
    });

    suite('without alarm api', function() {
      test('should silently stop', function(done) {
        navigator.mozAlarms = null;
        subject.workQueue(function() {
          done();
        });
      });
    });

    suite('alarm in db and no alarm with 48 hours', function() {
      add(new Date(2012, 0, 3), 3);

      setup(function(done) {
        getAllResults.push(Factory('alarm', {
          trigger: new Date()
        }));

        subject.workQueue(now, done);
      });

      test('after', function() {
        assert.length(added, 0);
      });
    });

    suite('no alarm in db and no alarm within 48 hours', function() {
      add(new Date(2012, 0, 3), 3);

      setup(function(done) {
        subject.workQueue(now, done);
      });

      test('after complete', function() {
        assert.length(added, 1);

        assert.deepEqual(
          added[0][0],
          new Date(2012, 0, 3)
        );
      });

    });

    suite('initial add', function() {
      // 5 hours from now floating time
      add(new Date(2012, 0, 1, 5), 1, 1, true);

      // 23 hours from now
      add(new Date(2012, 0, 1, 23), 2);

      // over 48 hours from now (yes this works)
      // this record should be skipped and left
      // in the database.
      add(new Date(2012, 0, 3), 3);

      setup(function(done) {
        subject.workQueue(now, done);
      });

      test('alarms', function(done) {
        getAll(function(records) {
          done(function() {
            assert.length(records, 1);
            assert.equal(records[0].busytimeId, 3);
          });
        });
      });

      test('after complete', function() {
        assert.length(added, 2);

        assert.deepEqual(added[0][0], new Date(2012, 0, 1, 5));
        assert.equal(
          added[0][1], 'ignoreTimezone', 'floating time ignoreTimezone'
        );

        assert.hasProperties(added[0][2], {
          busytimeId: 1
        });

        assert.deepEqual(added[1][0], new Date(2012, 0, 1, 23), 'abs trigger');
        assert.equal(added[1][1], 'honorTimezone', 'abs time honorTimezone');
        assert.hasProperties(added[1][2], {
          busytimeId: 2
        });
      });

    });

  });

});
