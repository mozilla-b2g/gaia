marionette('Alarm Panel', function() {
  var assert = require('assert');
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

  suite('Alarm creation', function() {

    setup(function() {
      clock.navigate('alarmForm');
      assert.ok(
        clock.els.alarmNameInput.displayed(),
        'Alarm name input is displayed'
      );
    });

    test('Creation', function() {
      var alarms;
      var time = new Date();

      time.setHours(3);
      time.setMinutes(42);

      clock.els.alarmNameInput.sendKeys(['coffee break']);
      setValue(clock.els.timeInput, time);

      console.log(getState(client));
      clock.submitAlarm();

      alarms = clock.els.alarmListItemS;

      assert.equal(alarms.length, 1);
      assert.ok(
        alarms[0].text().indexOf('3:42') > -1,
        'Alarm time is rendered'
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
    });

    test('Closing form', function() {
      assert.ok(clock.els.alarmFormCloseBtn.displayed(),
        '"Close" button is displayed');

      clock.els.alarmFormCloseBtn.tap();

      client.waitFor(function() {
        return !clock.els.alarmForm.displayed();
      });
      assert.ok(clock.els.alarmFormBtn.displayed(),
        '"New Alarm" button is displayed');
      assert.ok(!clock.els.alarmForm.displayed(),
        'Alarm form is not displayed');
    });

  });

  suite('Alarm manipulation', function() {});
  suite('Alarm deletion', function() {});

});
