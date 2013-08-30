requireApp('clock/js/constants.js');
requireApp('clock/js/utils.js');

suite('Time functions', function() {

  var _;

  var DAYS = [
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday',
    'saturday', 'sunday'
  ];

  suiteSetup(function() {
    _ = MockL10n.get;
  });

  suite('#summarizeDaysOfWeek', function() {
    var summarizeDaysOfWeek;

    before(function() {
      summarizeDaysOfWeek = Utils.summarizeDaysOfWeek;
    });

    test('should summarize everyday', function() {
      assert.equal(summarizeDaysOfWeek({
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: true,
        sunday: true
      }), _('everyday'));
    });

    test('should summarize weekdays', function() {
      assert.equal(summarizeDaysOfWeek({
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true
      }), _('weekdays'));
    });

    test('should summarize weekends', function() {
      assert.equal(summarizeDaysOfWeek({
        saturday: true,
        sunday: true
      }), _('weekends'));
    });

    test('should summarize never', function() {
      assert.equal(summarizeDaysOfWeek({}), _('never'));
    });

    test('should summarize a single day', function() {
      assert.equal(summarizeDaysOfWeek({monday: true}),
                   _('weekday-1-short'));
    });

    test('should summarize a single day', function() {
      var monTueWed = _('weekday-1-short') + ', ' +
                      _('weekday-2-short') + ', ' +
                      _('weekday-3-short');
      assert.equal(summarizeDaysOfWeek({
        monday: true,
        tuesday: true,
        wednesday: true
      }), monTueWed);
    });

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
        test(DAYS[repday] + '[' + el[0] + '] is in ' +
             JSON.stringify(oddeven), function() {
          assert.ok(Utils.isDateInRepeat(oddeven, daymap.get(el[0])));
        });
        test(DAYS[repday] + '[' + el[0] + '] is not in ' +
             JSON.stringify(evenodd), function() {
          assert.ok(!Utils.isDateInRepeat(evenodd, daymap.get(el[0])));
        });
      })(el);
    }
  });

  suite('repeatDays', function() {
    for (var i = 0; i <= 7; i++) {
      var rep = {};
      for (var j = 0; j < i; j++) {
        rep[DAYS[j]] = true;
      }
      (function(testrepeat, value) {
        test(JSON.stringify(testrepeat) + ' has ' + value + ' repeat days',
          function() {
          assert.equal(Utils.repeatDays(testrepeat), value);
        });
      })(rep, i);
    }
  });

  suite('#isAlarmPassToday', function() {

    var isAlarmPassToday;

    setup(function() {
      var time = new Date();
      time.setHours(6, 30);
      this.clock = sinon.useFakeTimers(time.getTime());
      isAlarmPassToday = Utils.isAlarmPassToday;
    });

    teardown(function() {
      this.clock.restore();
    });

    test('prior hour, prior minute', function() {
      assert.isTrue(isAlarmPassToday(5, 00));
    });

    test('prior hour, current minute', function() {
      assert.isTrue(isAlarmPassToday(5, 30));
    });

    test('prior hour, later minute', function() {
      assert.isTrue(isAlarmPassToday(5, 45));
    });

    test('current hour, prior minute', function() {
      assert.isTrue(isAlarmPassToday(6, 29));
    });

    test('current hour, current minute', function() {
      assert.isTrue(isAlarmPassToday(6, 30));
    });

    test('current hour, later minute', function() {
      assert.isFalse(isAlarmPassToday(6, 31));
    });

    test('later hour, prior minute', function() {
      assert.isFalse(isAlarmPassToday(7, 29));
    });

    test('later hour, current minute', function() {
      assert.isFalse(isAlarmPassToday(7, 30));
    });

    test('later hour, later minute', function() {
      assert.isFalse(isAlarmPassToday(7, 31));
    });

  });

  suite('Next alarm time', function() {

    var clockSetter = function(thisVal) {
      return function(x) {
        this.sinon.clock.tick(
          (-1 * this.sinon.clock.tick()) + x);
      }.bind(thisVal);
    };

    var alarmTime, alarmDate, setClock;

    setup(function() {
      setClock = clockSetter(this);
      // Wed Jul 17 2013 19:07:18 GMT-0400 (EDT)
      alarmTime = 1374057000000;
      alarmDate = new Date(alarmTime);
      this.alarm = {
        repeat: {},
        hour: alarmDate.getHours(),
        minute: alarmDate.getMinutes()
      };
      this.sinon.useFakeTimers();
    });

    test('No repeat -> today', function() {
      setClock(alarmTime - 60000);
      assert.equal(
        Utils.getNextAlarmFireTime(this.alarm).getTime(),
        alarmTime);
    });

    test('No repeat -> tomorrow', function() {
      setClock(alarmTime + 60000);
      assert.equal(Utils.getNextAlarmFireTime(this.alarm).getTime(),
        alarmTime + (24 * 60 * 60 * 1000));
    });

    for (var i = 0; i <= 7; i++) {
      // starting on wednesday, today, then loop around and cover
      // wednesday, tomorrow
      var thisDay = DAYS[(2 + i) % 7];
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
          assert.equal(Utils.getNextAlarmFireTime(this.alarm).getTime(),
            compareDate.getTime());
        };
      })(i, thisDay));
    }
  });

  suite('#changeSelectByValue', function() {

    var changeSelectByValue, selectDOM;

    setup(function() {
      changeSelectByValue = Utils.changeSelectByValue;
      selectDOM = document.createElement('select');
      selectDOM.innerHTML = ['<option value="a">A</option>',
        '<option value="b">B</option>',
        '<option value="c" selected>C</option>'
      ].join('');
    });

    test('correctly selects the specified element', function() {
      changeSelectByValue(selectDOM, 'b');
      assert.equal(selectDOM.selectedIndex, 1);
    });

    test('has no effect when specified element does not exist', function() {
      changeSelectByValue(selectDOM, 'g');
      assert.equal(selectDOM.selectedIndex, 2);
    });

  });

  suite('#formatTime', function() {
    var is12hStub, formatTime;

    setup(function() {
      formatTime = Utils.formatTime;
      is12hStub = sinon.stub(Utils, 'is12hFormat');
    });

    teardown(function() {
      is12hStub.restore();
    });

    test('12:00am, with 12 hour clock settings', function() {
      is12hStub.returns(true);
      assert.equal(formatTime(0, 0), '12:00AM');
    });

    test('12:30pm, with 12 hour clock settings', function() {
      is12hStub.returns(true);
      assert.equal(formatTime(12, 30), '12:30PM');
    });

    test('11:30pm, with 12 hour clock settings', function() {
      is12hStub.returns(true);
      assert.equal(formatTime(23, 30), '11:30PM');
    });

    test('12:30am, with 24 hour clock settings', function() {
      is12hStub.returns(false);
      assert.equal(formatTime(0, 30), '00:30');
    });

    test('12:30pm, with 24 hour clock settings', function() {
      is12hStub.returns(false);
      assert.equal(formatTime(12, 30), '12:30');
    });

    test('11:30pm, with 24 hour clock settings', function() {
      is12hStub.returns(false);
      assert.equal(formatTime(23, 30), '23:30');
    });

  });

  suite('#parseTime', function() {

    var parseTime;

    suiteSetup(function() {
      parseTime = Utils.parseTime;
    });

    test('12:10am', function() {
      var time = parseTime('12:10AM');
      assert.equal(time.hour, 0);
      assert.equal(time.minute, 10);
    });

    test('12:00pm', function() {
      var time = parseTime('12:00PM');
      assert.equal(time.hour, 12);
      assert.equal(time.minute, 00);
    });

    test('11:30pm', function() {
      var time = parseTime('11:30PM');
      assert.equal(time.hour, 23);
      assert.equal(time.minute, 30);
    });

    test('00:15', function() {
      var time = parseTime('12:15AM');
      assert.equal(time.hour, 0);
      assert.equal(time.minute, 15);
    });

    test('23:45', function() {
      var time = parseTime('23:45');
      assert.equal(time.hour, 23);
      assert.equal(time.minute, 45);
    });
  });
});
