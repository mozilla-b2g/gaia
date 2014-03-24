/* global requireApp, suite, suiteSetup, MockNavigatorSettings, sinon,
   suiteTeardown, setup, test, dataFTUCustomizer, assert*/

'use strict';

requireApp('operatorvariant/js/customizers/customizer.js');
requireApp('operatorvariant/js/customizers/data_ftu_customizer.js');
requireApp('operatorvariant/test/unit/mock_navigator_moz_settings.js');

suite('Data FTU customizer >', function() {
  var createLockSpy, realSettings;

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
    dataFTUCustomizer.set(true);
    assert.isTrue(createLockSpy.calledOnce);
  });
});
