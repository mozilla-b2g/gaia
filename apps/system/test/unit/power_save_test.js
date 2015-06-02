'use strict';
/* global BatteryOverlay,
          NotificationHelper,
          MockNavigatorBattery,
          MockNavigatorSettings,
          MockSettingsListener,
          MocksHelper,
          PowerSave,
          MockL10n
*/

requireApp('system/test/unit/mock_navigator_battery.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/shared/test/unit/mocks/mock_notification_helper.js');
requireApp('system/test/unit/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_l10n.js');
requireApp('system/js/service.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/base_icon.js');
requireApp('system/js/battery_icon.js');
requireApp('system/js/power_save.js');
requireApp('system/js/battery_overlay.js');

var mocksForPowerSave = new MocksHelper([
  'SettingsListener', 'NotificationHelper', 'LazyLoader'
]).init();

suite('power save >', function() {

  var realMozSettings;
  var subject;
  var realBattery, battery, realL10n;

  mocksForPowerSave.attachTestHelpers();
  suiteSetup(function() {
    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    realL10n = window.navigator.mozL10n;
    window.navigator.mozL10n = MockL10n;

    subject = new PowerSave();

    realBattery = subject._battery;
    window.batteryOverlay = new BatteryOverlay();
    window.batteryOverlay._battery = MockNavigatorBattery;
    battery = window.batteryOverlay._battery;
  });

  suiteTeardown(function() {
    subject = null;

    battery = null;
    window.batteryOverlay._battery = realBattery;
    window.batteryOverlay = null;

    navigator.mozSettings = realMozSettings;
    navigator.mozL10n = realL10n;
  });

  suite('restores state >', function() {
    var dispatchSpy, enablePowerSpy, disablePowerSpy,
        doCheckThresholdSpy, checkThresholdSpy;
    setup(function(){
      dispatchSpy = this.sinon.spy(window, 'dispatchEvent');
      subject.start();
      enablePowerSpy  = this.sinon.spy(subject, 'enablePowerSave');
      disablePowerSpy = this.sinon.spy(subject, 'disablePowerSave');
      checkThresholdSpy = this.sinon.spy(subject, 'checkThreshold');
      doCheckThresholdSpy = this.sinon.spy(subject, 'doCheckThreshold');
    });

    test('restores all states', function() {
      var state;
      for (state in subject._states) {
        MockSettingsListener.mCallbacks[state](true);
      }
      MockSettingsListener.mCallbacks['powersave.enabled'](true);
      sinon.assert.called(enablePowerSpy);
      sinon.assert.notCalled(disablePowerSpy);
      sinon.assert.calledOnce(dispatchSpy);
      // States should be false now.
      for (state in subject._states) {
        if ('bluetooth.enabled' !== state) {
          assert.equal(false, MockNavigatorSettings.mSettings[state]);
        }
      }

      for (state in subject._states) {
        MockSettingsListener.mCallbacks[state](false);
      }
      MockSettingsListener.mCallbacks['powersave.enabled'](false);
      sinon.assert.called(disablePowerSpy);

      sinon.assert.calledTwice(dispatchSpy);
      // States should be restored.
      for (state in subject._states) {
        if ('bluetooth.enabled' !== state) {
          assert.equal(true, MockNavigatorSettings.mSettings[state]);
        }
      }
    });

    test('when bluetooth powerSaveResume stat is false, ' +
      'the dispatchEvent is not called', function() {
        var state;
        for (state in subject._states) {
          MockSettingsListener.mCallbacks[state](true);
        }
        subject._powerSaveResume['bluetooth.enabled'] = false;
        MockSettingsListener.mCallbacks['powersave.enabled'](false);
        sinon.assert.called(disablePowerSpy);

        sinon.assert.notCalled(dispatchSpy);
        // States should be restored.
        for (state in subject._states) {
          if ('bluetooth.enabled' !== state) {
            assert.equal(true, MockNavigatorSettings.mSettings[state]);
          }
        }
    });

    test('change to powersave.threshold calls doCheckThreshold', function() {
      MockSettingsListener.mCallbacks['powersave.threshold'](0.1);
      sinon.assert.notCalled(checkThresholdSpy);
      sinon.assert.calledOnce(doCheckThresholdSpy);
      sinon.assert.calledWith(doCheckThresholdSpy, 0.1);
    });
  });

  suite('battery change >', function() {
    suite('onBatteryChange behavior >', function() {
      var checkSpy, setSpy;
      setup(function() {
        checkSpy = this.sinon.spy(subject, 'checkThreshold');
        setSpy = this.sinon.spy(subject, 'setMozSettings');
      });

      test('no checkThreshold call when charging', function() {
        battery.charging = true;
        subject.onBatteryChange();
        sinon.assert.notCalled(checkSpy);
      });

      test('checkThreshold called when not charging', function() {
        battery.charging = false;
        subject.onBatteryChange();
        sinon.assert.calledOnce(checkSpy);
      });

      test('charging with powersave enabled sets setting to false', function() {
        battery.charging = true;
        subject._powerSaveEnabled = true;
        subject.onBatteryChange();
        sinon.assert.calledOnce(setSpy);
        sinon.assert.calledWith(setSpy, { 'powersave.enabled': false });
      });

      test('charging with powersave disables does nothing', function() {
        battery.charging = true;
        subject._powerSaveEnabled = false;
        subject.onBatteryChange();
        sinon.assert.notCalled(setSpy);
      });
    });

    suite('showPowerSavingNotification behavior', function() {
      test('notification sent with showOnlyOnce behavior', function() {
        var notificationSpy = this.sinon.spy(NotificationHelper, 'send');
        subject.showPowerSavingNotification();
        sinon.assert.calledOnce(notificationSpy);
        assert.isObject(notificationSpy.args[0][1].mozbehavior);
        assert.isTrue(notificationSpy.args[0][1].mozbehavior.showOnlyOnce);
      });
    });

    suite('checkThreshold behavior', function() {
      var setSpy;
      setup(function() {
        MockNavigatorSettings.mSetup();
        MockNavigatorSettings.mSyncRepliesOnly = true;
        setSpy = this.sinon.spy(subject, 'setMozSettings');
        battery.level = 0.15;
      });

      teardown(function() {
        MockNavigatorSettings.mTeardown();
      });

      test('powersave.threshold -1 does nothing', function() {
        MockNavigatorSettings.createLock().set({'powersave.threshold': -1});
        subject.checkThreshold();
        MockNavigatorSettings.mReplyToRequests();
        sinon.assert.notCalled(setSpy);
      });

      function trigger(threshold, value) {
        MockNavigatorSettings.createLock().set({
          'powersave.threshold': threshold
        });
        subject._powerSaveEnabled = value;
        subject.checkThreshold();
        MockNavigatorSettings.mReplyToRequests();
      }

      suite('level under threshold', function() {
        test('enable power save if not already enabled', function() {
          trigger(0.25, false);
          sinon.assert.calledOnce(setSpy);
          sinon.assert.calledWith(setSpy, { 'powersave.enabled': true });
        });

        test('keep power save enabled', function() {
          MockNavigatorSettings.createLock().set({'powersave.enabled': true});
          trigger(0.25, true);
          sinon.assert.notCalled(setSpy);
          assert.equal(true,
            MockNavigatorSettings.mSettings['powersave.enabled']);
        });
      });

      suite('level above threshold', function() {
        test('disable power save if it was enabled', function() {
          trigger(0.05, true);
          sinon.assert.calledOnce(setSpy);
          sinon.assert.calledWith(setSpy, { 'powersave.enabled': false });
        });

        test('keep power save disabled', function() {
          MockNavigatorSettings.createLock().set({'powersave.enabled': false});
          trigger(0.05, false);
          sinon.assert.notCalled(setSpy);
          assert.equal(false,
            MockNavigatorSettings.mSettings['powersave.enabled']);
        });
      });
    });
  });
});
