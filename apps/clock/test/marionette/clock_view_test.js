marionette('Clock', function() {
  var CLOCK_ORIGIN = 'app://clock.gaiamobile.org';
  var assert = require('assert');
  var client = marionette.client();
  var selectors = {
    analogClock: '#analog-clock',
    digitalClock: '#digital-clock',
    alarmFormBtn: '#alarm-new',
    alarmForm: '#alarm',
    alarmFormCloseBtn: '#alarm-close',
    alarmCreateBtn: '#alarm-done',
    alarmNameInput: '#edit-alarm [name="alarm.label"]',
    timeInput: '#time-select',
    alarmList: '#alarms',
    alarmListItem: '.alarm-cell',
    countdownBanner: '#banner-countdown'
  };

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

  setup(function() {
    client.apps.launch(CLOCK_ORIGIN);
    client.apps.switchToApp(CLOCK_ORIGIN);
    this.elems = {};
    Object.keys(selectors).forEach(function(key) {
      Object.defineProperty(this.elems, key, {
        get: function() {
          return client.findElement(selectors[key]);
        }
      });
    }.bind(this));
  });

  test('Default View', function() {
    assert.ok(this.elems.analogClock.displayed(),
      'analog clock is displayed');
    assert.ok(!this.elems.digitalClock.displayed(),
      'digital clock is not displayed');
    assert.ok(this.elems.alarmFormBtn.displayed(),
      '"New Alarm" button is displayed');
    assert.ok(!this.elems.alarmForm.displayed(),
      'Alarm form is not displayed');

    this.elems.analogClock.tap();
    assert.ok(!this.elems.analogClock.displayed(),
      'analog clock is not displayed after tap');
    assert.ok(this.elems.digitalClock.displayed(),
      'digital clock is displayed after tap');
  });

  suite('New Alarm', function() {

    // Return state of provided client as a string (for debugging purposes)
    function getState(client) {
      return client.executeScript(function() {
        var target = document.querySelector('.view:target');
        if (target) {
          target = target.outerHTML.split(/[\r\n]/)[0].replace(/>.*/, '>');
        }
        return '    location: ' + window.location.toString() + '\n' +
          '    target: ' + target;
      });
    };

    setup(function() {
      console.log('setup');
      console.log(getState(client));

      this.elems.alarmFormBtn.click();
      assert.ok(this.elems.alarmForm.displayed(), 'Alarm form is displayed');
      var i = 0;
      client.waitFor(function() {
        console.log('  waiting... #' + i + ':');
        console.log(getState(client));
        /*if (i > 0) {
          var html = client.executeScript(function() {
            return document.documentElement.innerHTML;
          });
          console.log(html);
        }*/
        i++;
        return this.elems.alarmCreateBtn.displayed();
      }.bind(this), {
        interval: 1000,
        timeout: 9000
      });
    });

    test('Creation', function() {
      var time = new Date();
      // Allow for a longer timeout to account for the long-lived 'Countdown
      // banner'.
      var timeout = 10 * 1000;
      var alarms;

      time.setHours(3);
      time.setMinutes(42);
      this.timeout(timeout);

      assert.ok(
        this.elems.alarmNameInput.displayed(),
        'Alarm name input is displayed'
      );

      this.elems.alarmNameInput.sendKeys(['coffee break']);
      setValue(this.elems.timeInput, time);

      this.elems.alarmCreateBtn.click();

      // The alarm form closes with an animation, so the test must be suspended
      // until it is completely hidden.
      client.waitFor(function() {
        return !this.elems.alarmForm.displayed();
      }.bind(this));

      alarms = client.findElements(selectors.alarmListItem);

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
        this.elems.countdownBanner.displayed(),
        'Countdown banner is displayed'
      );

      // Ensure that the 'Countdown banner' element is eventually hidden.
      client.waitFor(function() {
        return !this.elems.countdownBanner.displayed();
      }.bind(this), {
        timeout: timeout
      });
    });

    test('Closing form', function() {
      assert.ok(this.elems.alarmFormCloseBtn.displayed(),
        '"Close" button is displayed');

      // Close alarm form
      this.elems.alarmFormCloseBtn.click();
      assert.ok(this.elems.alarmFormBtn.displayed(),
        '"New Alarm" button is displayed');
      client.waitFor(function() {
        return !this.elems.alarmForm.displayed();
      }.bind(this));
      assert.ok(!this.elems.alarmForm.displayed(),
        'Alarm form is not displayed');
    });

  });

});
