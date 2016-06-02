/* global requireApp, suite, suiteSetup, suiteTeardown, setup, teardown,
   test,  sinon, Resources, ringtoneCustomizer */

'use strict';

requireApp('operatorvariant/test/unit/mock_navigator_moz_settings.js');

requireApp('operatorvariant/js/resources.js');
requireApp('operatorvariant/js/customizers/customizer.js');
requireApp('operatorvariant/js/customizers/ringtone_customizer.js');

suite('RingtoneCustomizer >', function() {
  var ringtoneParams = {
    uri: '/test/unit/resources/5secs.ogg',
    name: 'ringtone'
  };

  var TINY_TIMEOUT = 20;

  var realSettings;

  suiteSetup(function() {
    realSettings = navigator.mozSettings;
    navigator.mozSettings = window.MockNavigatorSettings;
  });

  suiteTeardown(function() {
    navigator.mozSettings = realSettings;
  });

  setup(function() {
    this.sinon.useFakeTimers();
  });

  teardown(function() {
    navigator.mozSettings.mTeardown();
    this.sinon.clock.restore();
  });

  test(' First run with valid SIM. Set > ', function() {
    var resourcesSpy = sinon.spy(Resources, 'load');
    ringtoneCustomizer.simPresentOnFirstBoot = true;
    ringtoneCustomizer.set(ringtoneParams);
    this.sinon.clock.tick(TINY_TIMEOUT);
    sinon.assert.calledOnce(resourcesSpy);
    sinon.assert.calledWith(resourcesSpy, ringtoneParams.uri, 'blob');
    resourcesSpy.restore();
  });

  test(' set the ringtone > ', function() {
    var createLockSpy = sinon.spy(navigator.mozSettings, 'createLock');
    this.sinon.stub(Resources, 'load', function(uri, type, onsuccess) {
      onsuccess('ABC');
    });
    ringtoneCustomizer.simPresentOnFirstBoot = true;
    ringtoneCustomizer.set(ringtoneParams);
    sinon.assert.calledOnce(createLockSpy);
    createLockSpy.restore();
  });

  test(' First run outwith valid SIM. Not set > ', function() {
    var createLockSpy = sinon.spy(navigator.mozSettings, 'createLock');
    this.sinon.stub(Resources, 'load', function(uri, type, onsuccess) {
      onsuccess('ABC');
    });
    ringtoneCustomizer.simPresentOnFirstBoot = false;
    ringtoneCustomizer.set(ringtoneParams);
    sinon.assert.notCalled(createLockSpy);
    createLockSpy.restore();
  });

});
