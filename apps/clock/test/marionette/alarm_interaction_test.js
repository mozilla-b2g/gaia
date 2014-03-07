marionette('Alarm interaction', function() {
  'use strict';
  /* global marionetteScriptFinished */

  var assert = require('./lib/assert');
  var Alarm = require('./lib/alarm');
  var Clock = require('./lib/clock');
  var client = marionette.client();
  var alarm, twentyFromNow, thirtyFromNow;

  setup(function() {
    alarm = new Alarm(client);

    twentyFromNow = alarm.fromNow(1000 * 60 * 20);
    thirtyFromNow = alarm.fromNow(1000 * 60 * 30);

    alarm.launch();
    alarm.openForm();
  });

  function assertAlarmIconEquals(enabled) {
    client.setScriptTimeout(2000);
    var result = client.executeAsyncScript(function() {
      var req = navigator.mozSettings.createLock().get('alarm.enabled');
      req.onsuccess = function() {
        marionetteScriptFinished(req.result['alarm.enabled']);
      };
    });
    assert.equal(result, enabled);
  }

  suite('Creation', function() {
    // Each assertion is made in a separate test to facilitate parallelization.
    var alarms;

    setup(function() {
      alarm.fill({
        name: 'coffee break',
        time: twentyFromNow
      });
      alarm.formSubmit();

      alarms = alarm.readItems();
    });

    test('insertion of a new row in the alarms list', function() {
      assert.equal(alarms.length, 1);
    });

    test('alarm icon shows up in status bar', function() {
      assertAlarmIconEquals(true);
    });

    test('new alarm item is enabled by default', function() {
      assert(alarm.isEnabled({ index: 0 }), 'Alarm is enabled');
    });

    test('new alarm item has the correct time', function() {
      assert.hasTime(
        alarms[0], twentyFromNow, 'Alarm time is rendered'
      );
    });

    test('new alarm item has the correct title', function() {
      assert(
        alarms[0].indexOf('coffee break') > -1,
        'Alarm title is rendered'
      );
    });

    test('the countdown banner is displayed and hidden', function() {
      assert(alarm.countdownBannerDisplayed, 'Countdown banner is displayed');
      alarm.waitForBannerHidden();
    });

    test('New Alarm button always shows new title', function() {
      alarm.waitForBannerHidden();

      // Delete the first alarm, then re-open the edit form.
      alarm.openForm(0);
      alarm.formDelete();
      alarm.openForm();

      var el = client.findElement('.new-alarm-title');
      assert.ok(el.displayed());
      alarm.formClose();
    });

    suite('creation of multiple alarms', function() {

      setup(function() {
        alarm.waitForBannerHidden();
        alarm.openForm();

        alarm.fill({
          name: 'quitting time',
          time: thirtyFromNow
        });

        alarm.formSubmit();

        alarms = alarm.readItems();
      });

      test('insertion of a new row in the alarms list', function() {
        assert.equal(alarms.length, 2);
      });

      test('new alarm item has the correct time', function() {
        assert.hasTime(
          alarms[0],
          thirtyFromNow,
          'Newest alarm title is rendered first'
        );
      });

      test('new alarm item has the correct title', function() {
        assert(
          alarms[0].indexOf('quitting time') > -1,
          'Newest alarm title is rendered first'
        );
      });

      test('previously-created alarm maintains its time', function() {
        assert.hasTime(
          alarms[1],
          twentyFromNow,
          'Previously-created alarm time is rendered second'
        );
      });

      test('previously-created alarm maintains its title', function() {
        assert(
          alarms[1].indexOf('coffee break') > -1,
          'Previously-created alarm title is rendered second'
        );
      });

      test('the countdown banner is displayed and hidden', function() {
        assert(alarm.countdownBannerDisplayed, 'Countdown banner is displayed');
        alarm.waitForBannerHidden();
      });
    });
  });

  test('Closing form', function() {
    alarm.formClose();
    assert(
      alarm.el.panels.alarm.displayed(),
      'Alarm panel is displayed'
    );
  });

  suite('Alarm manipulation', function() {
    var alarmItem;

    setup(function() {
      alarm.fill({
        name: 'coffee break',
        time: twentyFromNow
      });

      alarm.formSubmit();

      // Ensure the banner is hidden before the tests continue because it
      // obscures the alarm list
      alarm.waitForBannerHidden();

      alarmItem = alarm.readItems()[0];
    });

    test('updating', function() {
      var vals;

      alarm.openForm(0);
      vals = alarm.readForm('name', 'time');

      assert.equal(
        vals.name,
        'coffee break',
        'Alarm name input field is pre-populated with current value'
      );
      assert.hasTime(
        vals.time,
        twentyFromNow,
        'Alarm time input field is pre-populated with current value'
      );

      alarm.fill({
        name: 'quitting time',
        time: thirtyFromNow
      });

      alarm.formSubmit();

      alarmItem = alarm.readItems()[0];

      assert(
        alarmItem.indexOf('quitting time') > -1,
        'Alarm description is updated'
      );
      assert.hasTime(alarmItem, thirtyFromNow, 'Alarm time is updated');
      assert(
        alarm.countdownBannerDisplayed,
        'Countdown banner is displayed'
      );
    });

    test('toggling', function() {
      alarm.toggleAlarm({ index: 0 });

      assert(
        !alarm.isEnabled({ index: 0 }),
        'Alarm is disabled after toggling'
      );

      assert(
        !alarm.countdownBannerDisplayed,
        'Countdown banner is not displayed after disabling an alarm'
      );

      alarm.toggleAlarm({ index: 0 });
      assert(
        alarm.isEnabled({ index: 0 }),
        'Alarm is re-enabled after toggling'
      );

      alarm.waitForBannerHidden();
    });

    test('firing', function() {
      // Trigger a fake 'alarm' event:
      client.executeScript(function() {
        var id = document.querySelector('.alarm-item').dataset.id;
        var alarm = new CustomEvent('test-alarm', {
          detail: {
            id: parseInt(id, 10),
            type: 'normal'
          }
        });
        window.dispatchEvent(alarm);
      });
      // Switch to the system frame
      client.switchToFrame();
      // Now grab the Attention Screen frame
      client.switchToFrame(
        client.findElement('iframe[data-frame-name="_blank"]'));
      // Click the "stop" button
      var el = client.helper.waitForElement('#ring-button-stop');
      try {
        el.click();
      } catch(e) {
        // Marionette throws an error because the frame closes while
        // handling the click event. This is expected.
      }
      // Now switch back to the system, then to the clock.
      client.switchToFrame();
      client.apps.switchToApp(Clock.ORIGIN);

      // Make sure we can see the analog clock again.
      var clock = client.helper.waitForElement('#analog-clock');
      assert(clock.displayed());
    });

    test('deletion', function() {
      alarm.openForm(0);
      alarm.formDelete();
      assert.equal(
        alarm.readItems().length,
        0,
        'deleted alarm is removed from the alarm list'
      );
      assertAlarmIconEquals(false);
    });
  });

});
