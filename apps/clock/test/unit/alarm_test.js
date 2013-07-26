requireApp('clock/js/utils.js');
requireApp('clock/js/alarm.js');
requireApp('clock/js/alarmsdb.js');
requireApp('clock/js/alarm_edit.js');
requireApp('clock/js/alarm_manager.js');
requireApp('clock/js/alarm_list.js');
requireApp('clock/js/active_alarm.js');

requireApp('clock/test/unit/mock_l10n.js');
requireApp('clock/test/unit/mock_mozAlarm.js');
requireApp('clock/test/unit/mock_alarmsDB.js');

suite('Alarm Test', function() {

  var nativeMozL10n = navigator.mozL10n;
  var nativeAlarmsDB = window.AlarmsDB;

  suiteSetup(function() {
    navigator.mozL10n = MockL10n;
    window.AlarmsDB = new MockAlarmsDB();
    sinon.stub(ActiveAlarm, 'onAlarmFiredHandler');
    navigator.mozAlarms = new MockMozAlarms(
      ActiveAlarm.onAlarmFiredHandler);
  });

  suiteTeardown(function() {
    navigator.mozL10n = nativeMozL10n;
    ActiveAlarm.onAlarmFiredHandler.restore();
    window.AlarmsDB = nativeAlarmsDB;
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
      this.start = 1374102438043;
      this.startDate = new Date(this.start);
      this.alarm = new Alarm({
        hour: this.startDate.getHours(),
        minute: this.startDate.getMinutes(),
        repeat: '0101011'
      });
      this.sinon.useFakeTimers();
    });

    teardown(function() {
    });

    test('Alarm Configuration', function() {
      assert.deepEqual(this.alarm.getTime(), [19, 7]);
      this.alarm.setTime([15, 43]);
      assert.deepEqual(this.alarm.getTime(), [15, 43]);
      this.alarm.setTime(13, 9);
      assert.deepEqual(this.alarm.getTime(), [13, 9]);

      assert.deepEqual(this.alarm.getRepeat(), {
        tuesday: true, thursday: true,
        saturday: true, sunday: true
      });
    });

    test('Alarm snooze', function() {
      clockSetter(this)(this.start);
      this.alarm.snooze = 5;
      assert.equal(this.alarm.getNextSnoozeFireTime().getTime(),
                   this.start + (5 * 60 * 1000));
      this.alarm.snooze = null;
      assert.equal(this.alarm.getNextSnoozeFireTime(), null);
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
        if (([0, 31, 96, 127]).indexOf(i) !== -1) {
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
        this.alarm.setRepeat(repeat);
        // Assorted days test
        assert.equal(this.alarm.summarizeDaysOfWeek(),
          expected.join(', '),
          'Summarizing ' + JSON.stringify(repeat));
      }
    });

    test('Weekend alarm summary', function() {
      // Weekend test
      this.alarm.setRepeat({saturday: true, sunday: true});
      assert.equal(this.alarm.summarizeDaysOfWeek(), 'weekends');
    });

    test('Weekday alarm summary', function() {
      // Weekdays test
      this.alarm.setRepeat({
        monday: true, tuesday: true, wednesday: true,
        thursday: true, friday: true
      });
      // Everyday test
      assert.equal(this.alarm.summarizeDaysOfWeek(), 'weekdays');
    });

    test('Every day alarm summary', function() {
      this.alarm.setRepeat({
        monday: true, tuesday: true, wednesday: true,
        thursday: true, friday: true, saturday: true,
        sunday: true
      });
      assert.equal(this.alarm.summarizeDaysOfWeek(), 'everyday');
    });

    test('Never alarm summary', function() {
      // never test
      this.alarm.setRepeat({});
      assert.equal(this.alarm.summarizeDaysOfWeek(), 'never');
    });

    test('Alarm Passed Today', function() {
      var setClock = clockSetter(this);
      // Wed Jul 17 2013 06:30:00 GMT-0400 (EDT)
      var alarmDate = new Date(1374057000000);
      alarmDate.setHours(18, 30, 0);
      var alarmTime = alarmDate.getTime();
      // set the alarm time
      this.alarm.setTime(alarmDate.getHours(), alarmDate.getMinutes());
      // test all combinations of +/- minute/hour
      var minuteOffsets = [-61, -60, -1, 0, 1, 60, 61];
      for (var i = 0; i < minuteOffsets.length; i++) {
        setClock(alarmTime + (minuteOffsets[i] * 60000));
        assert.equal(this.alarm.isAlarmPassedToday(),
          minuteOffsets[i] >= 0);
      }
    });

    suite('Next alarm time', function() {

      var alarmTime, alarmDate, setClock;

      setup(function() {
        setClock = clockSetter(this);
        // Wed Jul 17 2013 06:30:00 GMT-0400 (EDT)
        alarmTime = 1374057000000;
        alarmDate = new Date(alarmTime);
        this.alarm.setTime(alarmDate.getHours(), alarmDate.getMinutes());
        this.alarm.setRepeat({});
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
            this.alarm.setRepeat(repeat);
            assert.equal(this.alarm.getNextAlarmFireTime().getTime(),
                         compareDate.getTime());
          };
        })(i, thisDay));
      }
    });
  });

});

