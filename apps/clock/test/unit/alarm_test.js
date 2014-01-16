mocha.setup({ globals: ['GestureDetector'] });

suite('Alarm Test', function() {

  var Alarm, ActiveAlarm;
  var nativeMozAlarms = navigator.mozAlarms;

  suiteSetup(function(done) {
    testRequire(['alarm', 'active_alarm', 'mocks/mock_moz_alarm'],
      function(alarm, activeAlarm, mockMozAlarms) {
        Alarm = alarm;
        ActiveAlarm = activeAlarm;
        navigator.mozAlarms = new mockMozAlarms.MockMozAlarms(
          ActiveAlarm.handler
        );

        done();
      }
    );
  });

  suiteTeardown(function() {
    navigator.mozAlarms = nativeMozAlarms;
  });

  setup(function() {
    this.sinon.stub(ActiveAlarm.singleton(), 'handler');
  });

  suite('Date handling', function() {

    var clockSetter = function(thisVal) {
      return function(x) {
        this.sinon.clock.tick(
          (-1 * this.sinon.clock.tick()) + x);
      }.bind(thisVal);
    };

    var days = ['monday', 'tuesday', 'wednesday', 'thursday',
                'friday', 'saturday', 'sunday'];

    setup(function() {
      // Wed Jul 17 2013 19:07:18 GMT-0400 (EDT)
      this.startDate = new Date(1374102438043);
      this.startDate.setHours(19, 7, 18);
      while (this.startDate.getDay() !== 3) {
        this.startDate.setHours(this.startDate.getHours() + 24);
      }
      this.start = this.startDate.getTime();
      this.alarm = new Alarm({
        hour: this.startDate.getHours(),
        minute: this.startDate.getMinutes(),
        repeat: {
          tuesday: true, thursday: true, saturday: true,
          sunday: true
        }
      });
      this.sinon.useFakeTimers();
    });

    suite('initialization', function() {
      test('time', function() {
        assert.deepEqual(this.alarm.time, [19, 7]);
      });
      test('repeat', function() {
        assert.deepEqual(this.alarm.repeat, {
          tuesday: true, thursday: true,
          saturday: true, sunday: true
        });
      });
    });

    suite('configuration', function() {
      test('time', function() {
        this.alarm.time = [15, 43];
        assert.deepEqual(this.alarm.time, [15, 43]);
      });
      test('repeat', function() {
        this.alarm.repeat = {
          monday: true,
          tuesday: true
        };
        assert.deepEqual(this.alarm.repeat, {
          monday: true, tuesday: true
        });
      });
    });

    suite('Alarm snooze', function() {

      test('snooze for 5 minutes', function() {
        clockSetter(this)(this.start);
        this.alarm.snooze = 5;
        assert.equal(this.alarm.getNextSnoozeFireTime().getTime(),
                     this.start + (5 * 60 * 1000));
      });

      test('snooze for 5 minutes, test seconds and milliseconds', function() {
        var msOffset = 12512;
        clockSetter(this)(this.start + msOffset);
        this.alarm.snooze = 5;
        assert.equal(this.alarm.getNextSnoozeFireTime().getTime(),
          this.start + (5 * 60 * 1000) + msOffset);
      });

      test('snooze for 5 minutes', function() {
        clockSetter(this)(this.start);
        this.alarm.snooze = null;
        assert.equal(this.alarm.getNextSnoozeFireTime(), null,
          'no snooze set, getNextSnoozeFireTime should be null');
      });

    });

    test('Alarm custom summary', function() {
      // Account for week beginning differences between date and alarm order
      var shortNames = [1, 2, 3, 4, 5, 6, 0].map(function(x) {
        return 'weekday-' + x + '-short';
      });
      // test all possible combinations, except special cases
      for (var i = 0; i < 128; i++) {
        /*
          0 => never
          31 => weekdays
          96 => weekends
          127 => every day
        */
        if ([0, 31, 96, 127].indexOf(i) !== -1) {
          continue;
        }
        var expected = [];
        var repeat = {};
        for (var j = 0; j < 7; j++) {
          if ((i & (1 << j)) !== 0) {
            expected.push(shortNames[j]);
            repeat[days[j]] = true;
          }
        }
        this.alarm.repeat = repeat;
        // Assorted days test
        assert.equal(this.alarm.summarizeDaysOfWeek(),
          expected.join(', '),
          'Summarizing ' + JSON.stringify(repeat));
      }
    });

    test('Weekend alarm summary', function() {
      // Weekend test
      this.alarm.repeat = {saturday: true, sunday: true};
      assert.equal(this.alarm.summarizeDaysOfWeek(), 'weekends');
    });

    test('Weekday alarm summary', function() {
      // Weekdays test
      this.alarm.repeat = {
        monday: true, tuesday: true, wednesday: true,
        thursday: true, friday: true
      };
      // Everyday test
      assert.equal(this.alarm.summarizeDaysOfWeek(), 'weekdays');
    });

    test('Every day alarm summary', function() {
      this.alarm.repeat = {
        monday: true, tuesday: true, wednesday: true,
        thursday: true, friday: true, saturday: true,
        sunday: true
      };
      assert.equal(this.alarm.summarizeDaysOfWeek(), 'everyday');
    });

    test('Never alarm summary', function() {
      // never test
      this.alarm.repeat = {};
      assert.equal(this.alarm.summarizeDaysOfWeek(), 'never');
    });

    test('Alarm Passed Today', function() {
      var setClock = clockSetter(this);
      // Wed Jul 17 2013 06:30:00 GMT-0400 (EDT)
      var alarmDate = new Date(1374057000000);
      alarmDate.setHours(18, 30, 0);
      var alarmTime = alarmDate.getTime();
      // set the alarm time
      this.alarm.time = [alarmDate.getHours(), alarmDate.getMinutes()];
      // test all combinations of +/- minute/hour
      var minuteOffsets = [-61, -60, -1, 0, 1, 60, 61];
      for (var i = 0; i < minuteOffsets.length; i++) {
        setClock(alarmTime + (minuteOffsets[i] * 60000));
        assert.equal(this.alarm.isAlarmPassedToday(),
          minuteOffsets[i] >= 0);
      }
    });

    suite('isDateInRepeat', function() {

      var daymap = new Map();

      var repeatodd = {
        monday: true, // 1
        wednesday: true, // 3
        friday: true // 5
      };

      var repeateven = {
        sunday: true, // 0
        tuesday: true, // 2
        thursday: true, // 4
        saturday: true // 6
      };

      var cur = new Date();
      for (var i = 0; i < 7; i++) {
        daymap.set(cur.getDay(), cur);
        cur = new Date(cur.getTime() + (24 * 3600 * 1000));
      }

      for (var el of daymap) {
        (function(el) {
          var repday = (el[0] + 6) % 7;
          var oddeven = ((el[0] % 2) === 1) ? repeatodd : repeateven;
          var evenodd = ((el[0] % 2) === 0) ? repeatodd : repeateven;
          test(days[repday] + '[' + el[0] + '] is in ' +
               JSON.stringify(oddeven), function() {
            var testalarm = new Alarm({
              repeat: oddeven
            });
            assert.ok(testalarm.isDateInRepeat(daymap.get(el[0])));
          });
          test(days[repday] + '[' + el[0] + '] is not in ' +
               JSON.stringify(evenodd), function() {
            var testalarm = new Alarm({
              repeat: evenodd
            });
            assert.ok(!testalarm.isDateInRepeat(daymap.get(el[0])));
          });
        })(el);
      }
    });

    suite('repeatDays', function() {
      for (var i = 0; i <= 7; i++) {
        var rep = {};
        for (var j = 0; j < i; j++) {
          rep[days[j]] = true;
        }
        (function(testrepeat, value) {
          test(JSON.stringify(testrepeat) + ' has ' + value + ' repeat days',
            function() {
            var testalarm = new Alarm({
              repeat: testrepeat
            });
            assert.equal(testalarm.repeatDays(), value);
          });
        })(rep, i);
      }
    });

    suite('Next alarm time', function() {

      var alarmTime, alarmDate, setClock;

      setup(function() {
        setClock = clockSetter(this);
        // Wed Jul 17 2013 06:30:00 GMT-0400 (EDT)
        alarmTime = 1374057000000;
        alarmDate = new Date(alarmTime);
        alarmDate.setHours(6, 30, 0);
        while (alarmDate.getDay() !== 3) {
          alarmDate.setHours(alarmDate.getHours() + 24);
        }
        alarmTime = alarmDate.getTime();
        this.alarm.time = [alarmDate.getHours(), alarmDate.getMinutes()];
        this.alarm.repeat = {};
      });

      test('No repeat -> today', function() {
        setClock(alarmTime - 60000);
        assert.equal(this.alarm.getNextAlarmFireTime().getTime(), alarmTime);
      });

      test('No repeat -> tomorrow', function() {
        setClock(alarmTime + 60000);
        assert.equal(this.alarm.getNextAlarmFireTime().getTime(),
          alarmTime + (24 * 60 * 60 * 1000));
      });

      for (var i = 0; i <= 7; i++) {
        // starting on wednesday, today, then loop around and cover
        // wednesday, tomorrow
        var thisDay = days[(2 + i) % 7];
        test('Check ' +
             ((i > 0) ? 'alarm-passed' : 'alarm-today') +
             ' with repeat ' + thisDay, (function(i, thisDay) {
          return function() {
            var compareDate = new Date(alarmTime);
            compareDate.setDate(compareDate.getDate() + i);
            if (i === 0) {
              setClock(alarmTime - 60000);
            } else {
              setClock(alarmTime + 60000);
            }
            // choose a repeat day
            var repeat = {};
            repeat[thisDay] = true;
            this.alarm.repeat = repeat;
            assert.equal(this.alarm.getNextAlarmFireTime().getTime(),
                         compareDate.getTime());
          };
        })(i, thisDay));
      }
    });

    suite('Alarm scheduling', function() {
      var setClock;

      setup(function() {
        setClock = clockSetter(this);
        this.date = new Date(1374102438043);
        // 6:17 on a Wednesday
        this.date.setHours(6, 17, 0, 0);
        while (this.date.getDay() !== 3) {
          this.date = new Date(this.date.getTime() + (24 * 3600 * 1000));
        }
        setClock(this.date.getTime());

        this.alarm = new Alarm({
          id: 1,
          repeat: { wednesday: true, friday: true },
          hour: this.date.getHours(),
          minute: this.date.getMinutes(),
          snooze: 17
        });
      });

      teardown(function() {
        var alarms = navigator.mozAlarms.alarms;
        for (var i = 0; i < alarms.length; i++) {
          clearTimeout(alarms[i].timeout);
        }
        navigator.mozAlarms.alarms = [];
      });

      test('Scheduling a normal alarm for the first time, repeat',
        function(done) {
        var cur = this.date.getTime() + (60 * 1000);
        setClock(cur);
        this.alarm.schedule({
          type: 'normal', first: true
        }, function(err, alarm) {
          var alarms = navigator.mozAlarms.alarms;
          assert.equal(alarms.length, 1);
          assert.equal(alarms[0].id, alarm.registeredAlarms['normal']);
          assert.equal(alarms[0].date.getTime(),
            this.date.getTime() + (2 * 24 * 3600 * 1000));
          done();
        }.bind(this));
        this.sinon.clock.tick(1000);
      });

      test('Scheduling a normal alarm for the first time, no repeat',
        function(done) {
        this.alarm.repeat = {};
        var cur = this.date.getTime() + (60 * 1000);
        setClock(cur);
        this.alarm.schedule({
          type: 'normal', first: true
        }, function(err, alarm) {
          var alarms = navigator.mozAlarms.alarms;
          assert.equal(alarms.length, 1);
          assert.equal(alarms[0].id, alarm.registeredAlarms['normal']);
          assert.equal(alarms[0].date.getTime(),
            this.date.getTime() + (24 * 3600 * 1000));
          done();
        }.bind(this));
        this.sinon.clock.tick(1000);
      });

      test('Scheduling a normal alarm for the second time, repeat',
        function(done) {
        setClock(this.date.getTime());
        this.alarm.schedule({
          type: 'normal', first: false
        }, function(err, alarm) {
          var alarms = navigator.mozAlarms.alarms;
          assert.equal(alarms.length, 1);
          assert.equal(alarms[0].id, alarm.registeredAlarms['normal']);
          assert.equal(alarms[0].date.getTime(),
            this.date.getTime() + (2 * 24 * 3600 * 1000));
          done();
        }.bind(this));
        this.sinon.clock.tick(1000);
      });

      test('Scheduling a normal alarm for the first time, no repeat',
        function(done) {
        this.alarm.repeat = {};
        var cur = this.date.getTime() + (60 * 1000);
        setClock(cur);
        this.alarm.schedule({
          type: 'normal', first: true
        }, function(err, alarm) {
          var alarms = navigator.mozAlarms.alarms;
          assert.equal(alarms.length, 1);
          assert.equal(alarms[0].id, alarm.registeredAlarms['normal']);
          assert.equal(alarms[0].date.getTime(),
            this.date.getTime() + (24 * 3600 * 1000));
          done();
        }.bind(this));
        this.sinon.clock.tick(1000);
      });

      test('Scheduling a normal alarm for the second time, no repeat',
        function(done) {
        this.alarm.repeat = {};
        var cur = this.date.getTime() + (60 * 1000);
        setClock(cur);
        this.alarm.schedule({
          type: 'normal', first: false
        }, function(err, alarm) {
          var alarms = navigator.mozAlarms.alarms;
          assert.equal(alarms.length, 0);
          done();
        }.bind(this));
        this.sinon.clock.tick(1000);
      });

      test('Scheduling a snooze alarm',
        function(done) {
        this.alarm.repeat = {};
        setClock(this.date.getTime());
        this.alarm.schedule({
          type: 'snooze'
        }, function(err, alarm) {
          var alarms = navigator.mozAlarms.alarms;
          assert.equal(alarms.length, 1);
          assert.equal(alarms[0].id, alarm.registeredAlarms['snooze']);
          assert.equal(alarms[0].date.getTime(),
            this.date.getTime() + (17 * 60 * 1000));
          done();
        }.bind(this));
        this.sinon.clock.tick(1000);
      });
    });
  });
});
