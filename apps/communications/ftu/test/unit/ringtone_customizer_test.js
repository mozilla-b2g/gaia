'use strict';

requireApp('communications/ftu/js/customizers/ringtone_customizer.js');
requireApp('communications/ftu/test/unit/mock_navigator_moz_settings.js');

suite('ringtone customizer >', function() {
  var realSettings;

  suiteSetup(function() {
    realSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
  });

  suiteTeardown(function() {
    navigator.mozSettings = realSettings;
    realSettings = null;
  });

  test('setRingtone: OK', function() {
    var settingNameKey = 'dialer.ringtone';
    var settingValue = 'ringer_test.ogg';
    // Initial ringtone value
    MockNavigatorSettings.mSettings[settingNameKey] = '';

    ringtoneCustomizer.setRingtone(settingValue);

    assert.equal(MockNavigatorSettings.mSettings[settingNameKey], settingValue);
  });
 test('setRingtone with no url: OK', function() {
    var settingNameKey = 'dialer.ringtone';

    // Ini ringtone value
    MockNavigatorSettings.mSettings[settingNameKey] = 'oldValue';

    ringtoneCustomizer.setRingtone(null);
    assert.equal(MockNavigatorSettings.mSettings[settingNameKey], 'oldValue');

    ringtoneCustomizer.setRingtone();
    assert.equal(MockNavigatorSettings.mSettings[settingNameKey], 'oldValue');
  });

});
