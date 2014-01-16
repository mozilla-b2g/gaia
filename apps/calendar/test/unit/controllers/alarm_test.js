requireApp('calendar/shared/js/notification_helper.js');
requireLib('notification.js');

suiteGroup('Controllers.Alarm', function() {
  function mockRequestWakeLock(handler) {
    var realApi;

    function lockMock() {
      return {
        mAquired: false,
        mIsUnlocked: false,
        unlock: function() {
          this.mIsUnlocked = true;
        }
      };
    }

    suiteSetup(function() {
      realApi = navigator.requestWakeLock;

      navigator.requestWakeLock = function(type) {
        var lock = lockMock();
        lock.type = type;
        lock.mAquired = true;

        handler && handler(lock);

        return lock;
      };
    });

    suiteTeardown(function() {
      navigator.requestWakeLock = realApi;
    });
  }

  var subject;
  var app;
  var db;

  var alarmStore;
  var busytimeStore;
  var eventStore;
  var settingStore;

  setup(function(done) {
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
        handleMessagesCalled.push(arguments);
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
      handleMessagesCalled = [];
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
      var handleAlarmMessages = handleMessagesCalled[0];
      assert.ok(handleAlarmMessages);
      assert.equal(handleAlarmMessages[0], 'alarm');

      subject.handleAlarmMessage = function(msg) {
        done(function() {
          assert.equal(msg, 'foo');
        });
      };

      handleAlarmMessages[1]('foo');
    });

    test('notification messages', function(done) {
      subject.observe();
      var handleNotificationMessages = handleMessagesCalled[1];
      assert.ok(handleNotificationMessages);
      assert.equal(handleNotificationMessages[0], 'notification');

      subject.handleNotificationMessage = function(msg) {
        done(function() {
          assert.equal(msg, 'foo');
        });
      };

      handleNotificationMessages[1]('foo');
    });

    suite('#_sendAlarmNotification', function() {
      var realApi;
      var sent = [];
      var onsend;
      var MockNotifications = {
        send: function() {
          var args = Array.slice(arguments);
          var callback = args[args.length - 1];

          sent.push(args);
          // wait until next tick...
          setTimeout(callback);
        }
      };

      suiteSetup(function() {
        realApi = Calendar.Notification;
        Calendar.Notification = MockNotifications;
      });

      suiteTeardown(function() {
        Calendar.Notification = realApi;
      });

      test('issues notification', function(done) {
        var event = Factory('event');
        var busytime = Factory('busytime', { _id: '1' });
        var url = subject.displayURL + busytime._id;

        subject._sendAlarmNotification(
          {},
          event,
          busytime,
          function() {
            done(function() {
              var notification = sent[0];
              assert.ok(notification, 'sends notification');
              assert.ok(notification[0], 'has title');
              assert.equal(
                notification[1], event.remote.description, 'description'
              );
              assert.equal(notification[2], url, 'sends url');
            });
          }
        );
      });
    });

    suite('#handleAlarm', function() {
      var sent = [];
      var busytime;
      var event;
      var alarm;
      var transPending = 0;
      var worksQueue;

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

      var lock;
      mockRequestWakeLock(function(_lock) {
        lock = _lock;
      });

      setup(function() {
        lock = null;
        worksQueue = false;
        subject.observe();
        transPending = 0;
        sent.length = 0;
        event = null;
        busytime = null;

        alarmStore.workQueue = function() {
          worksQueue = true;
          var callback = Array.slice(arguments).pop();
          Calendar.nextTick(callback);
        };

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
          subject.handleAlarm(alarm, function() {
            Calendar.nextTick(function() {
              done(function() {
                assert.length(sent, 0);
                assert.ok(lock.mIsUnlocked, 'frees lock');
                assert.ok(worksQueue, 'works alarm queue');
              });
            });
          });
          assert.ok(lock.mAquired, 'aquired lock');
        });
      });

      test('missing records', function(done) {
        alarm = {
          eventId: 12,
          busytimeId: 12
        };

        subject.handleAlarm(alarm, function() {
          done(function() {
            assert.equal(sent.length, 0);
            assert.ok(worksQueue, 'works alarm queue');
          });
        });
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
          var isComplete = false;

          var sent;
          subject._sendAlarmNotification = function() {
            sent = Array.slice(arguments);
            assert.isFalse(
              lock.mIsUnlocked, 'is locked until notification is ready'
            );

            var cb = sent[sent.length - 1];
            cb();
            isComplete = true;
          };

          subject.handleAlarm(alarm, function() {
            Calendar.nextTick(function() {
              done(function() {
                assert.ok(isComplete);
                assert.deepEqual(sent[0], alarm);
                assert.ok(worksQueue, 'works alarm queue');
                assert.ok(lock.mIsUnlocked, 'frees lock');
              });
            });
          });

          assert.ok(lock.mAquired, 'aquired lock');
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
        var realLockApi;

        mockRequestWakeLock(function(lock) {
          if (lock.type === 'wifi') {
            locks.push(lock);
          }
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
              return lock.mIsUnlocked === true;
            });

            assert.ok(freedAll, 'all locks are freed.');
          }

          app.syncController.all = function(callback) {
            var lock = locks[locks.length - 1];
            assert.ok(lock, 'has lock');
            assert.isFalse(lock.mIsUnlocked, 'is locked');

            Calendar.nextTick(function() {
              callback();
              assert.isTrue(lock.mIsUnlocked, 'unlocks itself');

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

    suite('#handleNotificationMessage', function() {
      var realGo;
      var message;

      setup(function(done) {
        message = {
          clicked: true,
          imageURL: 'app://calendar.gaiamobile.org/icon.png?/alarm-display/foo'
        };

        realGo = app.go;
        done();
      });

      teardown(function() {
        Calendar.App.go = realGo;
      });

      test('receive a notification message', function(done) {

        app.go = function(place) {
          assert.equal(place, '/alarm-display/foo',
              'redirects to alarm display page');
          done();
        };

        subject.handleNotificationMessage(message);
      });
    });

  });
});
