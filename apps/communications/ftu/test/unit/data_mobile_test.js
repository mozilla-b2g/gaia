'use strict';

requireApp(
  'communications/ftu/test/unit/mock_navigator_moz_mobile_connection.js');
requireApp('communications/ftu/test/unit/mock_settings.js');
requireApp('system/test/unit/mock_settings_listener.js');
requireApp('communications/ftu/js/data_mobile.js');


suite('mobile data >', function() {
  var realSettings,
      realMozMobileConnection,
      settingKey = 'ril.data.enabled';

  suiteSetup(function() {
    realSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    realMozMobileConnection = navigator.mozMobileConnection;
    navigator.mozMobileConnection = MockNavigatorMozMobileConnection;

    DataMobile.init();
  });

  suiteTeardown(function() {
    navigator.mozSettings = realSettings;
    realSettings = null;

    navigator.mozMobileConnection = realMozMobileConnection;
    realMozMobileConnection = null;
  });

  test('load APN values from file', function(done) {
    var settingList = ['ril.data.apn',
                       'ril.data.user',
                       'ril.data.passwd',
                       'ril.data.httpProxyHost',
                       'ril.data.httpProxyPort'];
    MockNavigatorMozMobileConnection.iccInfo = {
      mcc: '214',
      mnc: '07'
      // real values taken from /shared/resources/apn.json, careful if changed
    };
    for (var settingName in settingList) {
      MockNavigatorSettings.mSettings[settingList[settingName]] = null;
    }

    DataMobile.getAPN(function() {
      for (var settingName in settingList) {
        assert.isNotNull(
                    MockNavigatorSettings.mSettings[settingList[settingName]]);
      }
      done();
    });
  });

  test('toggle status of mobile data', function(done) {
    MockNavigatorMozMobileConnection.iccInfo = {
      mcc: '214',
      mnc: '07'
      // real values taken from /shared/resources/apn.json, careful if changed
    };
    DataMobile.toggle(false, function() {
      assert.isFalse(MockNavigatorSettings.mSettings[settingKey]);
      done();
    });
  });


});
