'use strict';
/* global BaseModule */
/* global MocksHelper */
/* global MockL10n */
/* global MockNavigatorBattery */
/* global MockNavigatorSettings */

requireApp('system/test/unit/mock_lazy_loader.js');
requireApp('system/test/unit/mock_navigator_battery.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('system/test/unit/mock_sleep_menu.js');
requireApp('system/test/unit/mock_screen_manager.js');
require('/shared/test/unit/mocks/mock_gesture_detector.js');
require('/shared/test/unit/mocks/mock_l10n.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/base_icon.js');
requireApp('system/js/battery_icon.js');
requireApp('system/js/power_save.js');
requireApp('system/js/battery_overlay.js');

var mocksForBatteryOverlay = new MocksHelper([
  'SettingsListener',
  'sleepMenu',
  'GestureDetector',
  'LazyLoader'
]).init();

suite('battery manager >', function() {
  var realBattery;
  var screenNode, notifNode, overlayNode;
  var tinyTimeout = 10;

  var realMozSettings;
  var realL10n;
  var subject;

  mocksForBatteryOverlay.attachTestHelpers();
  suiteSetup(function() {
    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    // for PowerSave
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
  });

  suiteTeardown(function() {
    subject._battery = realBattery;
    realBattery = null;
    navigator.mozSettings = realMozSettings;

    navigator.mozL10n = realL10n;
  });

  setup(function() {
    subject = BaseModule.instantiate('BatteryOverlay');
    realBattery = subject._battery;
    subject._battery = MockNavigatorBattery;
    // must be big enough, otherwise the BatteryOverlay timeout occurs
    // before the different suites execute.
    subject.TOASTER_TIMEOUT = tinyTimeout;
    var batteryNotificationMarkup =
      '<div id="system-overlay" data-z-index-level="system-overlay">' +
        '<div id="battery">' +
          '<span class="icon-battery"></span>' +
          '<div class="battery-notification"> ' +
                '<span data-l10n-id="battery-almost-empty3">' +
                  'Battery almost empty.' +
                '</span>' +
                '<span data-l10n-id="plug-in-your-charger">' +
                  'Plug in your charger.' +
                '</span>' +
          '</div>' +
        '</div>' +
      '</div>';

    screenNode = document.createElement('div');
    screenNode.id = 'screen';
    screenNode.innerHTML = batteryNotificationMarkup;
    document.body.appendChild(screenNode);

    overlayNode = document.getElementById('system-overlay');
    notifNode = document.getElementById('battery');

    MockNavigatorBattery.level = 1;
  });

  teardown(function() {
    subject.stop();
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
        subject.start();
      });

      test('display notification', function() {
        assertDisplayed();
      });

      test('should send batteryshutdown when battery is below threshold',
      function() {
        this.sinon.stub(window, 'dispatchEvent');
        sendLevelChange(0.00);
        sinon.assert.calledWithMatch(window.dispatchEvent,
                                     { type: 'batteryshutdown' });
      });
    });

    suite('battery goes empty >', function() {
      setup(function() {
        sendLevelChange(0.05);
        subject.start();
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
        subject.start();
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
