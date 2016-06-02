/* global requireApp, suite, suiteSetup, suiteTeardown, setup, teardown, test,
   assert, sinon, smsCustomizer */

'use strict';

requireApp('operatorvariant/test/unit/mock_navigator_moz_settings.js');

requireApp('operatorvariant/js/customizers/customizer.js');
requireApp('operatorvariant/js/customizers/sms_customizer.js');

suite('SMS customizer >', function() {
  const SMS_MAX_CONCAT = 'operatorResource.sms.maxConcat';

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

  test(' set valid value (integer) > ', function() {
    var sttngs = navigator.mozSettings.mSettings;

    smsCustomizer.set({
      smsMaxConcat: 10
    });

    assert.isTrue(createLockSpy.calledOnce);

    assert.strictEqual(sttngs[SMS_MAX_CONCAT], 10);
  });

  test(' set valid value (decimal) > ', function() {
    var sttngs = navigator.mozSettings.mSettings;

    smsCustomizer.set({
      smsMaxConcat: 10.5
    });
    assert.isTrue(createLockSpy.calledOnce);

    assert.strictEqual(sttngs[SMS_MAX_CONCAT], 10);
  });

  test(' set invalid value (NaN) > ', function() {
    var sttngs = navigator.mozSettings.mSettings;

    smsCustomizer.set({
      smsMaxConcat: 'a'
    });
    assert.isTrue(createLockSpy.notCalled);

    assert.isUndefined(sttngs.SMS_MAX_CONCAT);
  });

  test(' set invalid value (negative value) > ', function() {
    var sttngs = navigator.mozSettings.mSettings;

    smsCustomizer.set({
      smsMaxConcat: -1
    });
    assert.isTrue(createLockSpy.notCalled);

    assert.isUndefined(sttngs.SMS_MAX_CONCAT);
  });
});
