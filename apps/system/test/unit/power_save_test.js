'use strict';
/* global MocksHelper, MockNavigatorSettings, MockSettingsListener,
   PowerSave, MockBluetooth */

requireApp('system/test/unit/mock_navigator_battery.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/test/unit/mock_bluetooth.js');
requireApp('system/js/power_save.js');

var mocksForPowerSave = new MocksHelper([
  'SettingsListener'
]).init();

suite('power save >', function() {

  var realBluetooth;
  var subject;

  mocksForPowerSave.attachTestHelpers();
  suiteSetup(function() {
    realBluetooth = window.Bluetooth;
    window.Bluetooth = MockBluetooth;

    subject = new PowerSave();
  });

  suiteTeardown(function() {
    window.Bluetooth = realBluetooth;
  });

  suite('restores state >', function() {
    setup(function(){
      sinon.spy(window, 'dispatchEvent');
      subject.start();
      sinon.spy(subject, 'enablePowerSave');
      sinon.spy(subject, 'disablePowerSave');
    });

    teardown(function() {
      window.dispatchEvent.restore();
      subject.enablePowerSave.restore();
      subject.disablePowerSave.restore();
    });

    test('restores all states', function() {
      var state;
      for (state in subject._states) {
        MockSettingsListener.mCallbacks[state](true);
      }
      MockSettingsListener.mCallbacks['powersave.enabled'](true);
      assert.ok(subject.enablePowerSave.called);
      assert.isFalse(subject.disablePowerSave.called);
      assert.ok(window.dispatchEvent.calledOnce);
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
      assert.ok(subject.disablePowerSave.called);

      assert.ok(window.dispatchEvent.calledTwice);
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
        assert.ok(subject.disablePowerSave.called);

        assert.ok(!window.dispatchEvent.called);
        // States should be restored.
        for (state in subject._states) {
          if ('bluetooth.enabled' !== state) {
            assert.equal(true, MockNavigatorSettings.mSettings[state]);
          }
        }
    });
  });
});
