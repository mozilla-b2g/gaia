requireApp('calendar/shared/js/notification_helper.js');

suiteGroup('Controllers.Alarm', function() {

  var subject;
  var app;
  var db;

  var alarmStore;
  var busytimeStore;
  var eventStore;
  var settingStore;

  setup(function(done) {
    this.timeout(10000);
    app = testSupport.calendar.app();
    db = app.db;
    subject = new Calendar.Controllers.Alarm(app);

    alarmStore = app.store('Alarm');
    busytimeStore = app.store('Busytime');
    eventStore = app.store('Event');
    settingStore = app.store('Setting');

    db.open(function() {
      done();
    });
  });

  teardown(function(done) {
    testSupport.calendar.clearStore(
      db,
      done
    );
  });

  teardown(function(done) {
    subject.unobserve();

    var defaults = settingStore.defaults;
    var trans = db.transaction('settings', 'readwrite');

    settingStore.remove('syncFrequency', trans);
    settingStore.remove('syncAlarm', trans);

    trans.oncomplete = function() {
      db.close();
      done();
    };

  });

  suite('#observe', function() {
    function sendId(id) {
      mockRequest.onsuccess({
        target: {
          result: id
        }
      });
    }

    var worksQueue;

    var realApi;
    var handleMessagesCalled;
    var realAlarmApi;
    var currentAlarmTime = null;
    var removed = null;
    var mockRequest = {};

    suiteSetup(function() {
      realApi = navigator.mozSetMessageHandler;
      navigator.mozSetMessageHandler = function() {
        handleMessagesCalled = arguments;
      };

      realAlarmApi = navigator.mozAlarms;

      var mockAlarms = navigator.mozAlarms = {
        add: function(endTime, _, data) {
          if (data && data.type === 'sync')
            currentAlarmTime = endTime;

          if (mockAlarms.onadd) {
            Calendar.nextTick(function() {
              mockAlarms.onadd();
            });
          }

          return mockRequest;
        },

        remove: function(id) {
          removed = id;
          currentAlarmTime = null;
        }
      };
    });

    suiteTeardown(function() {
      navigator.mozSetMessageHandler = realApi;
      navigator.mozAlarms = realAlarmApi;
    });

    setup(function() {
      handleMessagesCalled = false;
      worksQueue = false;
      alarmStore.workQueue = function() {
        worksQueue = true;
      };
    });

    teardown(function() {
      // cleanup previous test runs
      navigator.mozAlarms.onadd = null;

      // clear request between runs...
      mockRequest = {};
    });

    test('alarm messages', function(done) {
      subject.observe();
      assert.ok(handleMessagesCalled);
      assert.equal(handleMessagesCalled[0], 'alarm');

      subject.handleAlarmMessage = function(msg) {
        done(function() {
          assert.equal(msg, 'foo');
        });
      };

      handleMessagesCalled[1]('foo');
    });

    suite('#_sendAlarmNotification', function() {
      var realApi;
      var lastNotification;
      var sent = [];
      var onsend;
      var mockApi = {
        send: function() {
          sent.push(Array.prototype.slice.call(arguments));
          lastNotification = {};
          lastNotification;

          // wait until next tick...
          setTimeout(function() {
            onsend();
          }, 0);
        },

        getIconURI: function() {
          return 'icon';
        }
      };

      suiteSetup(function() {
        realApi = window.NotificationHelper;
        window.NotificationHelper = mockApi;
      });

      suiteTeardown(function() {
        window.NotificationHelper = realApi;
      });
/*
// These tests are currently failing on travis and have been temporarily
// disabled as per Bug 841815. They should be fixed and re-enabled as soon as
// possible as per Bug 840489.
      test('result', function(done) {
        sent.length = 0;
        var sentTo;

        var now = new Date();
        var event = Factory('event');
        var busytime = Factory('busytime');

        app.router.show = function(url) {
          sentTo = url;
        };

        onsend = function() {
          done(function() {
            var note = sent[0];
            assert.equal(note[1], event.remote.description);
            note[3]();
            assert.ok(sentTo);
            assert.include(sentTo, busytime._id);
          });
        };

        subject._sendAlarmNotification({}, event, busytime);
      });
*/
    });

    suite('#handleAlarm', function() {
      var sent = [];
      var busytime;
      var event;
      var alarm;

      var transPending = 0;

      function createTrans(done) {
        var trans = eventStore.db.transaction(
          ['busytimes', 'events', 'alarms'],
          'readwrite'
        );

        if (done) {
          trans.addEventListener('complete', function() {
            // wait until next tick so sync processing
            // of handleAlarm can finish first.
            setTimeout(function() {
              done();
            }, 0);
          });
        }

        return trans;
      }

      setup(function() {
        subject.observe();
        transPending = 0;
        sent.length = 0;
        event = null;
        busytime = null;

        subject._sendAlarmNotification = function() {
          sent.push(arguments);
        };
      });

      function setupAlarms(cb) {
        setup(function(done) {
          var trans = createTrans(done);
          cb(trans);

          if (alarm) {
            alarmStore.persist(alarm, trans);
          }

          if (event) {
            eventStore.persist(event, trans);
          }

          if (busytime) {
            busytimeStore.persist(busytime, trans);
          }
        });
      }

      suite('busytime in the past', function() {
        setupAlarms(function(trans) {
          var time = new Date();
          time.setMinutes(time.getMinutes() - 3);

          event = Factory('event');

          busytime = Factory('busytime', {
            eventId: event._id,
            startTime: new Date(2012, 0, 1),
            endDate: time
          });

          alarm = Factory('alarm', {
            startDate: new Date(2012, 0, 2),
            eventId: event._id,
            busytimeId: busytime._id
          });
        });

        test('result', function(done) {
          var trans = createTrans(function() {
            done(function() {
              assert.length(sent, 0);
            });
          });
          subject.handleAlarm(alarm, trans);
        });
      });

      test('missing records', function(done) {
        var trans = createTrans(function() {
          done(function() {
            assert.equal(sent.length, 0);
          });
        });

        alarm = {
          eventId: 12,
          busytimeId: 12
        };

        subject.handleAlarm(alarm, trans);
      });

      suite('valid busytime', function() {
        setupAlarms(function(trans) {
          var ends = new Date();
          ends.setMinutes(ends.getMinutes() + 100);

          event = Factory('event');

          busytime = Factory('busytime', {
            eventId: event._id,
            startTime: new Date(2012, 0, 1),
            endDate: ends
          });

          alarm = Factory('alarm', {
            eventId: event._id,
            busytimeId: busytime._id
          });
        });

        test('result', function(done) {
          var trans = createTrans(function() {
            done(function() {
              assert.deepEqual(sent[0][0], alarm);
              assert.length(sent, 1);
            });
          });
          subject.handleAlarm(alarm, trans);
        });
      });
    });

    suite('(perodic) sync alarms', function() {
      function willChangeAlarmId(newId, done) {
        navigator.mozAlarms.onadd = function() {
          settingStore.getValue('syncAlarm', function(err, value) {
            done(function() {
              assert.equal(value.alarmId, newId, 'changes alarm id');
            });
          });
        };
      }

      // get initial frequency
      var initialFreq;
      setup(function(done) {
        settingStore.getValue('syncFrequency', function(err, freq) {
          initialFreq = freq;
          done();
        });
      });

      // send initial alarm
      var initialAlarmId = 1;
      setup(function(done) {
        navigator.mozAlarms.onadd = function() {
          sendId(initialAlarmId);
          done();
        };

        subject.observe();
      });

      test('initial alarms', function(done) {
        settingStore.getValue('syncAlarm', function(err, value) {
          done(function() {
            assert.equal(
              value.alarmId,
              initialAlarmId,
              'saves alarm reference'
            );

            // calculate duration
            var duration = (
              (value.end.valueOf() - value.start.valueOf()) / 1000 / 60
            );

            assert.equal(
              // we don't care about seconds much its likely test drift.
              Math.ceil(duration),
              initialFreq,
              'sets correct duration'
            );
          });
        });
      });

      test('remove alarm by changing syncFrequency', function(done) {
        settingStore.set('syncFrequency', null);
        assert.equal(removed, initialAlarmId, 'removes alarm from mozAlarms');

        settingStore.getValue('syncAlarm', function(err, value) {
          done(function() {
            assert.hasProperties(value, {
              alarmId: null,
              end: null,
              start: null
            });
          });
        });
      });

      function testChangesToTime(freqDiff) {

        test('changing syncFrequency by: ' + freqDiff, function(done) {
          var newAlarmId = 2;
          var newFreq = initialFreq + freqDiff;

          // async assertion that alarm id will change
          willChangeAlarmId(newAlarmId, done);
          settingStore.set('syncFrequency', newFreq);

          // verify new alarm was set with right date
          var difference = Math.round(
            (currentAlarmTime - new Date()) / 1000 / 60
          );

          assert.equal(difference, newFreq);
          sendId(2);

          assert.equal(
            removed, initialAlarmId,
            'removes previous alarm on change'
          );
        });
      }

      // add time
      testChangesToTime(10);

      // reduce time
      testChangesToTime(-5);
    });

    suite('#handleAlarmMessage', function() {

      suite('type: sync', function() {
        var locks = [];

        var Lock = {
          locked: false,

          unlock: function() {
            this.locked = false;
          }
        };

        var realLockApi;

        suiteSetup(function() {
          realLockApi = navigator.requestWakeLock;

          navigator.requestWakeLock = function mockRequestLock(type) {
            if (type === 'wifi') {
              var lock = Object.create(Lock);
              locks.push(lock);

              lock.locked = true;
              return lock;
            }
          };
        });

        suiteTeardown(function() {
          navigator.requestWakeLock = realLockApi;
        });

        setup(function(done) {
          locks.length = 0;

          // stage first alarm to simulate real conditions.
          navigator.mozAlarms.onadd = function() {
            // save it
            sendId(1);
            done();
          };

          // setup observer
          subject.observe();
        });

        test('reschedules sync', function(done) {
          // mock out all
          app.syncController.all = function(cb) {
            Calendar.nextTick(cb);
          };

          var lastAlarmTime = new Date(currentAlarmTime);

          navigator.mozAlarms.onadd = function() {
            assert.equal(removed, 1, 'removes initial alarm');
            sendId(55);

            settingStore.getValue('syncAlarm', function(err, value) {
              done(function() {
                assert.equal(value.alarmId, 55, 'creates new alarm');

                assert.ok(
                  lastAlarmTime < currentAlarmTime,
                  'alarm time changes'
                );
              });
            });
          };

          subject.handleAlarmMessage({
            data: { type: 'sync' }
          });
        });

        test('multiple syncs', function(done) {
          var pending = 4;

          function onComplete() {
            assert.length(locks, 4, 'has correct number of locks');

            var freedAll = locks.every(function(lock) {
              return lock.locked === false;
            });

            assert.ok(freedAll, 'all locks are freed.');
          }

          app.syncController.all = function(callback) {
            var lock = locks[locks.length - 1];
            assert.ok(lock, 'has lock');
            assert.isTrue(lock.locked, 'is locked');

            Calendar.nextTick(function() {
              callback();
              assert.isFalse(lock.locked, 'unlocks itself');

              if (!(--pending))
                done(onComplete);
            });
          };

          var i = 0;
          while (i++ < pending)
            subject.handleAlarmMessage({ data: { type: 'sync' } });

        });

      });
    });

  });
});
