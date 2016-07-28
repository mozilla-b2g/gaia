/* global requireApp, suite, suiteSetup, suiteTeardown, setup, teardown, test,
   assert, sinon, dataFTUCustomizer */

'use strict';

requireApp('operatorvariant/test/unit/mock_navigator_moz_settings.js');

requireApp('operatorvariant/js/customizers/customizer.js');
requireApp('operatorvariant/js/customizers/data_ftu_customizer.js');

suite('Data FTU customizer >', function() {
  var createLockSpy;
  var realSettings;

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
    dataFTUCustomizer.set(true);
    assert.isTrue(createLockSpy.calledOnce);
  });
});
