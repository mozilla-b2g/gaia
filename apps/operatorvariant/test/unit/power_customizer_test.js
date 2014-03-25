/* global sinon, requireApp, suite, suiteSetup, suiteTeardown, setup, teardown,
   test, assert, powerCustomizer */

'use strict';

requireApp('operatorvariant/test/unit/mock_navigator_moz_settings.js');

requireApp('operatorvariant/js/customizers/customizer.js');
requireApp('operatorvariant/js/customizers/power_customizer.js');

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
    navigator.mozSettings = window.MockNavigatorSettings;
    createLockSpy = sinon.spy(navigator.mozSettings, 'createLock');
  });

  suiteTeardown(function() {
    navigator.mozSettings = realSettings;
    createLockSpy.restore();
  });

  setup(function() {
    createLockSpy.reset();
  });

  teardown(function() {
    navigator.mozSettings.mTeardown();
  });

  test(' set > ', function() {
    powerCustomizer.set(POWER_KEYS_VALUES);
    assert.isTrue(createLockSpy.calledOnce);
  });
});
