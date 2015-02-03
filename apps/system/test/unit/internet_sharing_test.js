'use strict';
/* global InternetSharing */
/* global MocksHelper */
/* global MockNavigatorSettings */
/* global Service */

requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('system/test/unit/mock_modal_dialog.js');
requireApp('system/js/service.js');
requireApp('system/js/internet_sharing.js');

var mocksForInternetSharing = new MocksHelper([
  'ModalDialog'
]).init();

suite('internet sharing > ', function() {
  // keys for settings
  const KEY_WIFI_HOTSPOT = 'tethering.wifi.enabled';

  var realSettings, subject;

  suiteSetup(function() {
    // Unfortunately, for asyncStorage scoping reasons, we can't simply
    // use 'attachTestHelpers' anywhere in the internet sharing tests.
    mocksForInternetSharing.suiteSetup();
    // we need MockIccHelper properly set
    mocksForInternetSharing.setup();

    realSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
    subject = new InternetSharing();
    subject.start();
  });

  suiteTeardown(function() {
    // we need MockIccHelper properly reset
    mocksForInternetSharing.teardown();
    mocksForInternetSharing.suiteTeardown();
    navigator.mozSettings = realSettings;
  });
  // helper function for batch assertion of mozSettings
  function assertSettingsEquals(testSet) {
    var mSettings = MockNavigatorSettings.mSettings;
    testSet.forEach(function(item) {
      assert.equal(mSettings[item.key], item.result);
    });
  }

  suite('wifi hotspot', function() {
    test('can\'t turn on hotspot when APM is on', function() {
      var testSet = [{'key': KEY_WIFI_HOTSPOT, 'result': false}];
      this.sinon.stub(Service, 'query').returns(true);
      subject.internetSharingSettingsChangeHanlder({
        settingName: 'wifi',
        settingValue: true
      });
      assertSettingsEquals(testSet);
    });

    test('can turn on hotspot when APM is off', function() {
      var testSet = [{'key': KEY_WIFI_HOTSPOT, 'result': true}];
      MockNavigatorSettings.mSettings[KEY_WIFI_HOTSPOT] = true;

      this.sinon.stub(Service, 'query').returns(false);
      subject.internetSharingSettingsChangeHanlder({
        settingName: 'wifi',
        settingValue: true
      });
      assertSettingsEquals(testSet);
    });
  });
});
