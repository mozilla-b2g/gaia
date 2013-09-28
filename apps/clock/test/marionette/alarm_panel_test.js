marionette('Alarm Panel', function() {
  var assert = require('./lib/assert');
  var Clock = require('./lib/clock');
  var client = marionette.client();
  var clock;

  function padZeros(val) {
    val = String(val);
    while (val.length < 2) {
      val = '0' + val;
    }
    return val;
  }

  // Set the value of a given input element. Encapsulates logic for setting
  // "time" and "date" input elements (which is currently unsupported by
  // Marionette).
  function setValue(element, value) {
    var type = element.getAttribute('type');
    if (value instanceof Date) {
      if (type === 'time') {
        value = [value.getHours(), value.getMinutes(), value.getSeconds()]
          .map(padZeros).join(':');
      } else {
        value = [
            value.getMonth() + 1,
            value.getDay(),
            value.getFullYear()
          ]
          .map(padZeros).join('-');
      }
    }
    element.client.executeScript(function(elem, value) {
      elem.value = value;
    }, [element, value]);
  }

  // Return state of provided client as a string (for debugging purposes)
  function getState(client) {
    return client.executeScript(function() {
      var target = document.querySelector(':target');
      var win = this.wrappedJSObject;
      if (target) {
        target = target.outerHTML.split(/[\r\n]/)[0].replace(/>.*/, '>');
      }
      return '    ' + [
        'location: ' + window.location.toString(),
        'target: ' + target
      ].join('\n    ');
    });
  }

  setup(function() {
    clock = new Clock(client);

    clock.launch();
    console.log('SETUP');
    console.log(getState(client));
  });

  test('Clock interaction', function() {
    assert.ok(clock.els.analogClock.displayed(),
      'analog clock is displayed');
    assert.ok(!clock.els.digitalClock.displayed(),
      'digital clock is not displayed');
    assert.ok(clock.els.alarmFormBtn.displayed(),
      '"New Alarm" button is displayed');
    assert.ok(!clock.els.alarmForm.displayed(),
      'Alarm form is not displayed');

    clock.els.analogClock.tap();

    assert.ok(!clock.els.analogClock.displayed(),
      'analog clock is not displayed after tap');
    assert.ok(clock.els.digitalClock.displayed(),
      'digital clock is displayed after tap');

    clock.els.digitalClock.tap();

    assert.ok(clock.els.analogClock.displayed(),
      'analog clock is displayed after tap');
    assert.ok(!clock.els.digitalClock.displayed(),
      'digital clock is not displayed after tap');
  });

  suite('Alarm interaction', function() {
    var twentyFromNow, thirtyFromNow;

    setup(function() {
      twentyFromNow = Clock.fromNow(1000 * 60 * 20);
      thirtyFromNow = Clock.fromNow(1000 * 60 * 30);

      clock.openAlarmForm();
    });

    test('Creation', function() {
      var alarms;

      clock.els.alarmNameInput.sendKeys(['coffee break']);
      setValue(clock.els.timeInput, twentyFromNow);

      console.log('About to submit alarm');
      console.log(getState(client));
      clock.submitAlarm();

      console.log('Alarm submitted');
      console.log(getState(client));
      alarms = clock.els.alarmListItemS;

      assert.equal(alarms.length, 1);
      assert.hasTime(
        alarms[0].text(), twentyFromNow, 'Alarm time is rendered'
      );
      assert.ok(
        alarms[0].text().indexOf('coffee break'),
        'Alarm title is rendered'
      );
      assert.ok(
        clock.els.countdownBanner.displayed(),
        'Countdown banner is displayed'
      );

      this.timeout(Clock.bannerTimeout);
      clock.waitForBanner();

      clock.openAlarmForm();

      clock.els.alarmNameInput.sendKeys(['quitting time']);
      setValue(clock.els.timeInput, thirtyFromNow);

      clock.submitAlarm();

      alarms = clock.els.alarmListItemS;

      assert.equal(alarms.length, 2);
      assert.hasTime(
        alarms[0].text(),
        thirtyFromNow,
        'Newest alarm title is rendered first'
      );
      assert.ok(
        alarms[0].text().indexOf('quitting time'),
        'Newest alarm title is rendered first'
      );
      assert.hasTime(
        alarms[1].text(),
        twentyFromNow,
        'Previously-created alarm time is rendered second'
      );
      assert.ok(
        alarms[1].text().indexOf('coffee break'),
        'Previously-created alarm title is rendered second'
      );
      assert.ok(
        clock.els.countdownBanner.displayed(),
        'Countdown banner is displayed'
      );
    });

    test('Closing form', function() {
      clock.els.alarmFormCloseBtn.tap();

      client.waitFor(function() {
        return !clock.els.alarmForm.displayed();
      });
      assert.ok(clock.els.panels.alarm.displayed(),
        'Alarm panel is displayed');
    });

    suite('Alarm manipulation', function() {
      var alarmItem;

      setup(function() {
        var alarms;
        clock.els.alarmNameInput.sendKeys(['coffee break']);
        setValue(clock.els.timeInput, twentyFromNow);

        clock.submitAlarm();

        // Ensure the banner is hidden before the test continues because it
        // obscures the alarm list
        this.timeout(Clock.bannerTimeout);
        clock.waitForBanner();

        alarmItem = clock.els.alarmListItemS[0];
      });

      test('updating', function() {
        clock.openAlarmForm(alarmItem);

        assert.equal(
          clock.els.alarmNameInput.getAttribute('value'),
          'coffee break',
          'Alarm name input field is pre-populated with current value'
        );
        assert.hasTime(
          clock.els.timeInput.getAttribute('value'),
          twentyFromNow,
          'Alarm time input field is pre-populated with current value'
        );

        clock.els.alarmNameInput.sendKeys([' delayed']);
        setValue(clock.els.timeInput, thirtyFromNow);

        clock.submitAlarm();

        alarmItem = clock.els.alarmListItemS[0];

        assert.ok(
          alarmItem.text().indexOf('coffee break delayed') > -1,
          'Alarm description is updated'
        );
        assert.hasTime(
          alarmItem.text(),
          thirtyFromNow,
          'Alarm time is updated'
        );
        assert.ok(
          clock.els.countdownBanner.displayed(),
          'Countdown banner is displayed'
        );
      });

      test('toggling', function() {
        clock.els.alarmEnablerS[0].tap();

        assert.ok(
          !clock.els.countdownBanner.displayed(),
          'Countdown banner is not displayed after disabling an alarm'
        );

        clock.els.alarmEnablerS[0].tap();

        client.waitFor(function() {
          return clock.els.countdownBanner.displayed();
        });
      });
    });

    suite('Alarm deletion', function() {});
  });

});
