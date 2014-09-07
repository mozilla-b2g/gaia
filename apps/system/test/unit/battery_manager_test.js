'use strict';

requireApp('system/test/unit/mock_navigator_battery.js');
requireApp('system/shared/js/settings_helper.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/test/unit/mock_sleep_menu.js');
requireApp('system/test/unit/mock_screen_manager.js');
require('/shared/test/unit/mocks/mock_gesture_detector.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('system/js/battery_manager.js');

var mocksForBatteryManager = new MocksHelper([
  'SettingsListener',
  'sleepMenu',
  'GestureDetector'
]).init();

suite('battery manager >', function() {
  var realBattery;
  var screenNode, notifNode, overlayNode;
  var tinyTimeout = 10;

  var realL10n;
  var realMozSettings;
  var realSettingsListener;

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

    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
    MockNavigatorSettings.mSetup();

    realSettingsListener = window.SettingsListener;
    window.SettingsListener = MockSettingsListener;
  });

  suiteTeardown(function() {
    BatteryManager._battery = realBattery;
    realBattery = null;

    navigator.mozL10n = realL10n;
    navigator.mozSettings = realMozSettings;
    window.SettingsListener = realSettingsListener;
  });

  setup(function() {
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
        var dispatchEventStub = this.sinon.stub(window, 'dispatchEvent');
        sendLevelChange(0.00);
        sinon.assert.calledWithMatch(window.dispatchEvent,
                                     { type: 'batteryshutdown' });
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

    suite('battery goes empty with powersave enabled>', function() {
      var notificationSpy;
      var notificationListenerSpy;
      var showNotificationSpy;
      var hideNotificationSpy

      setup(function() {
        this.sinon.useFakeTimers();
        SettingsListener.getSettingsLock().set({'powersave.enabled': true});
        notificationListenerSpy = this.sinon.spy('');

        notificationSpy = this.sinon.stub(window, 'Notification').returns({
          addEventListener: notificationListenerSpy,
          close: function() {}
        });

        showNotificationSpy = this.sinon.spy(PowerSaveHandler, 'showPowerSavingNotification');
        hideNotificationSpy = this.sinon.spy(PowerSaveHandler, 'hidePowerSavingNotification');
      });

      test('below threshold with powersave enabled', function() {
        sendLevelChange(0.05);
        MockSettingsListener.mTriggerCallback('powersave.threshold', 0.1);
        this.sinon.clock.tick(100);
        sinon.assert.calledOnce(showNotificationSpy);
        this.sinon.clock.tick(100);
        sinon.assert.notCalled(hideNotificationSpy);
      });

      test('above threshold with powersave enabled', function() {
        sendLevelChange(1);
        MockSettingsListener.mTriggerCallback('powersave.threshold', 0.1);
        this.sinon.clock.tick(100);
        sinon.assert.notCalled(showNotificationSpy);
        this.sinon.clock.tick(100);
        sinon.assert.calledOnce(hideNotificationSpy);
      });

      test('showNotification should create a notification',
        function() {
          PowerSaveHandler.showNotification();
          sinon.assert.calledOnce(notificationSpy);
      });
    });
  });
});
