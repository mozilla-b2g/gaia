/* global MockNavigatorSettings, sinon, powerCustomizer, requireApp, suite,
   suiteSetup, suiteTeardown, setup, test, assert */

'use strict';

requireApp('operatorvariant/js/customizers/customizer.js');
requireApp('operatorvariant/js/customizers/power_customizer.js');
requireApp('operatorvariant/test/unit/mock_navigator_moz_settings.js');

suite('power on/off customizer >', function() {
  var createLockSpy;
  var realSettings;
  const POWER_KEYS_VALUES = {
    'poweron': {
      'video': 'app://operatorresources/resources/power/power_on.mp4',
      'image': 'app://operatorresources/resources/power/power_on.png'
    }
  };

  suiteSetup(function() {
    realSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
    createLockSpy = sinon.spy(MockNavigatorSettings, 'createLock');
  });

  suiteTeardown(function() {
    navigator.mozSettings = realSettings;
    realSettings = null;
    createLockSpy.restore();
  });

  setup(function() {
    createLockSpy.reset();
  });

  test(' set > ', function() {
    powerCustomizer.set(POWER_KEYS_VALUES);
    assert.isTrue(createLockSpy.calledOnce);
  });
});
