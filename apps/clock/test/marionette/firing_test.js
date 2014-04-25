marionette('Alarm and Timer Firing', function() {
  'use strict';

  var assert = require('assert');
  var $ = require('./lib/mquery');
  var actions = new (require('./lib/actions'))();

  setup(function() {
    actions.launch('alarm');
  });

  function getWakeLockState() {
    return actions.executeScriptInSystemFrame(function() {
      return {
        screen: navigator.mozPower.getWakeLockState('screen'),
        cpu: navigator.mozPower.getWakeLockState('cpu')
      };
    });
  }
  function waitForLockStates(screenState, cpuState) {
    $.client.waitFor(function() {
      var state = getWakeLockState();
      return (state.screen === screenState && state.cpu === cpuState);
    });
  }

  /**
   * fireAction triggers in the scope of the attention frame. Dismiss the alarm.
   */
  [
    {
      dismissType: 'power',
      alarmResult: 'snoozed',
      timerResult: 'closed',
      fireAction: function() {
        actions.withSystemFrame(function() {
          $.client.apps.launch('app://homescreen.gaiamobile.org');
        });
      }
    },
    {
      // The 'interrupt' dismissType (for when a call comes in)
      // follows the same path as 'timeout'. When marionette or the
      // system gets a reasonable way to fake an incoming call
      // interruption, we should add a test case here.
      dismissType: 'timeout',
      alarmResult: 'silenced',
      timerResult: 'silenced',
      testOpts: {
        screenOnDuration: 100
      },
      fireAction: function() {
        waitForLockStates('unlocked', 'locked-foreground');
        actions.executeScriptInSystemFrame(function() {
          window.dispatchEvent(new CustomEvent('sleep'));
        });
        // For the sake of test-observing sanity, wait a moment here.
        $.client.helper.wait(1000);
        actions.executeScriptInSystemFrame(function() {
          window.dispatchEvent(new CustomEvent('wake'));
        });
      }
    },
    {
      dismissType: 'interrupt',
      alarmResult: 'silenced',
      timerResult: 'silenced',
      fireAction: function() {
        actions.executeScriptInAttentionFrame(function() {
          window.dispatchEvent(new CustomEvent('test-interrupt'));
        });
        // Simulate the phone switching away to another app.
        actions.withSystemFrame(function() {
          $.client.apps.launch('app://homescreen.gaiamobile.org');
        });
        $.client.helper.wait(1000);
        // Oh look, they finished the call.
        actions.withSystemFrame(function() {
          $.client.apps.launch('app://clock.gaiamobile.org');
        });
      }
    },
    {
      dismissType: 'volume',
      alarmResult: 'snoozed',
      timerResult: 'silenced',
      fireAction: function() {
        actions.executeScriptInSystemFrame(function() {
          window.dispatchEvent(new CustomEvent('volumeup'));
        });
      }
    },
    {
      dismissType: 'home',
      alarmResult: 'snoozed',
      timerResult: 'closed',
      fireAction: function() {
        actions.executeScriptInSystemFrame(function() {
          window.dispatchEvent(new CustomEvent('home'));
        });
      }
    },
    {
      dismissType: 'close',
      alarmResult: 'closed',
      timerResult: 'closed',
      fireAction: function() {
        // Click the "stop" button
        var el = $('#ring-button-stop');
        try {
          el.click();
        } catch(e) {
          // Marionette throws an error because the frame closes while
          // handling the click event. This is expected.
        }
      }
    },
    {
      dismissType: 'snooze',
      alarmResult: 'snoozed',
      fireAction: function() {
        // Click the "stop" button
        var el = $('#ring-button-snooze');
        try {
          el.click();
        } catch(e) {
          // Marionette throws an error because the frame closes while
          // handling the click event. This is expected.
        }
      }
    }
  ].forEach(function(data) {
    function assertSilenced() {
      actions.withSystemFrame(function() {
        assert.ok($('#attention-screen').displayed());
      });
      actions.withAttentionFrame(function() {
        assert.ok($('.ring-display.silenced').displayed());
      });
    }

    if ('alarmResult' in data) {
      test('Dismiss an alarm with "' + data.dismissType + '"', function() {
        actions.alarm.create();
        actions.alarm.fire(0, data.fireAction, data.testOpts);

        switch(data.alarmResult) {
        case 'snoozed':
          $('#analog-clock').waitToAppear();
          $.client.waitFor(function() {
            return actions.alarm.list[0].enabled === true;
          });
          break;
        case 'closed':
          $('#analog-clock').waitToAppear();
          $.client.waitFor(function() {
            return actions.alarm.list[0].enabled === false;
          });
          break;
        case 'silenced':
          assertSilenced();
          break;
        }
      });
    }

    if ('timerResult' in data) {
      test('Dismiss a timer with "' + data.dismissType + '"', function() {
        actions.openTab('timer');
        actions.timer.minutes = 1;
        actions.timer.start();
        actions.timer.fire(data.fireAction, data.testOpts);

        switch(data.timerResult) {
        case 'closed':
          $('[data-panel-id=timer]').waitToAppear();
          break;
        case 'silenced':
          assertSilenced();
          break;
        }
      });
    }
  });

  test('RingView respects screen and CPU wake locks', function() {
    this.timeout(30000);

    actions.openTab('timer');
    actions.timer.minutes = 1;

    waitForLockStates('unlocked', 'unlocked');

    actions.timer.start();
    actions.timer.fire(/* fireAction = */ null, {
      screenOnDuration: 3000,
      audibleDuration: 6000
    });

    waitForLockStates('locked-foreground', 'locked-foreground');
    waitForLockStates('unlocked', 'locked-foreground');
    waitForLockStates('unlocked', 'unlocked');
  });

  test('Timer fires in the background', function() {
    this.timeout(30000);

    actions.openTab('timer');
    actions.timer.minutes = 1;

    actions.timer.start();
    actions.timer.fire(/* fireAction = */ null, {
      delay: 4000,
      screenOnDuration: 3000,
      audibleDuration: 6000
    });

    actions.withSystemFrame(function() {
      $.client.apps.launch('app://homescreen.gaiamobile.org');
      $('#attention-screen').waitToAppear();
    });

    // We should still release locks in the appropriate order.
    waitForLockStates('locked-foreground', 'locked-foreground');
    waitForLockStates('unlocked', 'locked-foreground');
    waitForLockStates('unlocked', 'unlocked');
  });
});
