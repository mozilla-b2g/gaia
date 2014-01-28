'use strict';

requireApp('communications/ftu/js/resources.js');
requireApp('communications/ftu/js/customizers/customizer.js');
requireApp('communications/ftu/js/customizers/ringtone_customizer.js');
requireApp('communications/ftu/test/unit/mock_navigator_moz_settings.js');

suite('RingtoneCustomizer >', function() {
  var ringtoneParams = { uri: '/ftu/test/unit/resources/ringtone.opus',
                         name: 'ringtone' };
  var realSettings;

  suiteSetup(function() {
    realSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
  });

  suiteTeardown(function() {
    navigator.mozSettings = realSettings;
    realSettings = null;
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
