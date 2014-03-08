/* global requireApp, suite, suiteSetup, suiteTeardown,
   test,  sinon, Resources, ringtoneCustomizer */
'use strict';

requireApp('operatorvariant/js/resources.js');
requireApp('operatorvariant/js/customizers/customizer.js');
requireApp('operatorvariant/js/customizers/ringtone_customizer.js');
requireApp('operatorvariant/test/unit/mock_navigator_moz_settings.js');

suite('RingtoneCustomizer >', function() {
  var ringtoneParams = { uri: '/ftu/test/unit/resources/ringtone.ogg',
                         name: 'ringtone' };
  var realSettings;

  suiteSetup(function() {
    realSettings = navigator.mozSettings;
    navigator.mozSettings = window.MockNavigatorSettings;
  });

  suiteTeardown(function() {
    navigator.mozSettings.mTeardown();
    navigator.mozSettings = realSettings;
  });

  test(' request the right ringtone blob > ', function() {
    var resourcesSpy = sinon.spy(Resources, 'load');
    ringtoneCustomizer.set(ringtoneParams);
    sinon.assert.calledOnce(resourcesSpy);
    sinon.assert.calledWith(resourcesSpy, ringtoneParams.uri, 'blob');
    resourcesSpy.restore();
  });

  test(' set the ringtone > ', function() {
    var createLockSpy = sinon.spy(navigator.mozSettings, 'createLock');
    this.sinon.stub(Resources, 'load', function(uri, type, onsuccess) {
      onsuccess('ABC');
    });
    ringtoneCustomizer.set(ringtoneParams);
    sinon.assert.calledOnce(createLockSpy);
    createLockSpy.restore();
  });
});
