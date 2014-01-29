'use strict';

requireApp('system/test/unit/mock_navigator_battery.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/test/unit/mock_sleep_menu.js');
requireApp('system/test/unit/mock_screen_manager.js');
require('/shared/test/unit/mocks/mock_gesture_detector.js');
requireApp('system/test/unit/mock_l10n.js');
requireApp('system/js/battery_manager.js');

var mocksForBatteryManager = new MocksHelper([
  'SettingsListener',
  'SleepMenu',
  'GestureDetector'
]).init();

mocha.globals(['dispatchEvent']);

suite('battery manager >', function() {
  var realBattery;
  var screenNode, notifNode, overlayNode;
  var tinyTimeout = 10;

  var realL10n;

  mocksForBatteryManager.attachTestHelpers();
  suiteSetup(function() {
    realBattery = BatteryManager._battery;
    BatteryManager._battery = MockNavigatorBattery;

    // must be big enough, otherwise the BatteryManager timeout occurs
    // before the different suites execute.
    BatteryManager.TOASTER_TIMEOUT = tinyTimeout;
    // for PowerSaveHandler
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
  });

  suiteTeardown(function() {
    BatteryManager._battery = realBattery;
    realBattery = null;

    navigator.mozL10n = realL10n;
  });

  setup(function() {
    var batteryNotificationMarkup =
      '<div id="system-overlay" data-z-index-level="system-overlay">' +
        '<div id="battery">' +
          '<span class="icon-battery"></span>' +
          '<span class="battery-notification" ' +
                 'data-l10n-id="battery-almost-empty">Battery almost empty' +
          '</span>' +
        '</div>' +
      '</div>';

    screenNode = document.createElement('div');
    screenNode.id = 'screen';
    screenNode.innerHTML = batteryNotificationMarkup;
    document.body.appendChild(screenNode);

    overlayNode = document.getElementById('system-overlay');
    notifNode = document.getElementById('battery');

    MockNavigatorBattery.level = 1;
    PowerSaveHandler.init();
    BatteryManager.init();
  });

  teardown(function() {
    screenNode.parentNode.removeChild(screenNode);
  });

  function sendScreenChange(val) {
    var detail = { screenEnabled: val};
    var evt = new CustomEvent('screenchange', { detail: detail });
    window.dispatchEvent(evt);
  }

  function sendLevelChange(level) {
    MockNavigatorBattery.level = level;

    var evt = new CustomEvent('levelchange');
    MockNavigatorBattery.mTriggerEvent(evt);
  }

  function sendChargingChange(val) {
    MockNavigatorBattery.charging = val;

    var evt = new CustomEvent('chargingchange');
    MockNavigatorBattery.mTriggerEvent(evt);
  }

  suite('"level is near empty" notification >', function() {
    function assertDisplayed() {
      assert.ok(overlayNode.classList.contains('battery'));
    }

    function assertNotDisplayed() {
      assert.isFalse(overlayNode.classList.contains('battery'));
    }

    teardown(function(done) {
      // wait for the notification timeout
      setTimeout(done, tinyTimeout * 2);
    });

    suite('init >', function() {
      setup(function() {
        MockNavigatorBattery.level = 0.02;
        BatteryManager.init();
      });

      test('display notification', function() {
        assertDisplayed();
      });

      test('should send batteryshutdown when battery is below threshold',
      function() {
        var dispatchEventStub = this.sinon.stub(window, 'dispatchEvent')
          .throws('should send batteryshutdown event');
        dispatchEventStub.withArgs(sinon.match.has('type', 'batteryshutdown'));
        sendLevelChange(0.00);
        assert.isTrue(dispatchEventStub.called);
      });
    });

    suite('battery goes empty >', function() {
      setup(function() {
        sendLevelChange(0.05);
      });

      test('display notification', function() {
        assertDisplayed();
      });

      test('do not display twice', function(done) {
        setTimeout(function() {
          sendLevelChange(0.02);

          assertNotDisplayed();
          done();
        }, tinyTimeout * 2);
      });

      suite('charging >', function() {
        setup(function() {
          sendChargingChange(true);
        });

        test('hide notification', function() {
          assertNotDisplayed();
        });

        test('not charging > show notification', function() {
          sendChargingChange(false);
          assertDisplayed();
        });

        suite('goes up >', function() {
          setup(function() {
            sendLevelChange(0.2);
          });

          test('hide notification', function() {
            assertNotDisplayed();
          });

          suite('not charging >', function() {
            setup(function() {
              sendChargingChange(false);
            });

            test('should not display', function() {
              assertNotDisplayed();
            });

            test('goes empty again > display notification', function() {
              sendLevelChange(0.02);

              assertDisplayed();
            });
          });

        });

      });
    });

    suite('screen goes off > battery goes empty >', function() {
      setup(function() {
        sendScreenChange(false);
        sendLevelChange(0.05);
      });

      test('no notification', function() {
        assertNotDisplayed();
      });

      test('screen goes on > display notification', function() {
        sendScreenChange(true);

        assertDisplayed();
      });
    });
  });
});
