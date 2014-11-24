'use strict';
/* global MocksHelper */
/* global MockNavigatorSettings */
/* global MockSettingsListener */
/* global PowerSave */

requireApp('system/test/unit/mock_navigator_battery.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/js/power_save.js');


var mocksForPowerSave = new MocksHelper([
  'SettingsListener'
]).init();

suite('power save >', function() {

  var subject;

  mocksForPowerSave.attachTestHelpers();
  suiteSetup(function() {
    subject = new PowerSave();
  });

  suite('restores state >', function() {
    test('restores all states', function() {
      subject.start();
      var state;
      for (state in subject._states) {
        MockSettingsListener.mCallbacks[state](true);
      }

      MockSettingsListener.mCallbacks['powersave.enabled'](true);

      // States should be false now.
      for (state in subject._states) {
        assert.equal(false, MockNavigatorSettings.mSettings[state]);
      }

      MockSettingsListener.mCallbacks['powersave.enabled'](false);

      // States should be restored.
      for (state in subject._states) {
        assert.equal(true, MockNavigatorSettings.mSettings[state]);
      }
    });
  });
});
