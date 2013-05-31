'use strict';

requireApp('communications/ftu/test/unit/mock_icc_helper.js');
requireApp('communications/ftu/test/unit/mock_settings.js');
requireApp('system/test/unit/mock_settings_listener.js');
requireApp('communications/ftu/js/data_mobile.js');

var mocksHelperForNavigation = new MocksHelper(['IccHelper']);
mocksHelperForNavigation.init();

suite('mobile data >', function() {
  var realSettings,
      settingKey = 'ril.data.enabled';
  var mocksHelper = mocksHelperForNavigation;

  suiteSetup(function() {
    realSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    mocksHelper.suiteSetup();
    DataMobile.init();
  });

  suiteTeardown(function() {
    navigator.mozSettings = realSettings;
    realSettings = null;

    mocksHelper.suiteTeardown();
  });

  test('load APN values from file', function(done) {
    var settingList = ['ril.data.apn',
                       'ril.data.user',
                       'ril.data.passwd',
                       'ril.data.httpProxyHost',
                       'ril.data.httpProxyPort'];
    // real values taken from /shared/resources/apn.json, careful if changed
    IccHelper.setProperty('iccInfo', {mcc: '214', mnc: '07'});
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
    // real values taken from /shared/resources/apn.json, careful if changed
    IccHelper.setProperty('iccInfo', {mcc: '214', mnc: '07'});
    DataMobile.toggle(false, function() {
      assert.isFalse(MockNavigatorSettings.mSettings[settingKey]);
      done();
    });
  });


});
