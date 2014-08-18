/*global Hotspot, loadBodyHTML, MockNavigatorSettings, MocksHelper, MockL10n */

'use strict';

require('/js/hotspot.js');
require('/js/hotspot_wifi_settings.js');
require('/test/unit/mock_navigator_settings.js');
require('/shared/test/unit/mocks/mocks_helper.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/test/unit/mock_l10n.js');
require('/js/utils.js');
require('/shared/test/unit/load_body_html_helper.js');

var mocksHelperForHotspot = new MocksHelper([
    'SettingsListener'
]).init();

suite('Hotspot', function() {
  var realMozL10n;
  var realNavigatorSettings;

  mocksHelperForHotspot.attachTestHelpers();

  suiteSetup(function() {
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    realNavigatorSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
    loadBodyHTML('./_hotspot.html');
  });

  suiteTeardown(function() {
    document.body.innerHTML = '';

    navigator.mozL10n = realMozL10n;
    realMozL10n = null;

    navigator.mozSettings = realNavigatorSettings;
    realNavigatorSettings = null;
  });

  teardown(function() {
    MockNavigatorSettings.mTeardown();
  });

  suite('Check default hotspot password', function() {
    var settingPwd = 'tethering.wifi.security.password';
    var settingSsid = 'tethering.wifi.ssid';

    setup(function() {
      this.sinon.useFakeTimers();
      Hotspot.init();
      this.sinon.clock.tick();
    });

    test('password is correctly generated', function() {
      var re = new RegExp('[a-z]+[0-9]{4}');
      var generatedPassword = MockNavigatorSettings.mSettings[settingPwd];
      assert.isTrue(re.test(generatedPassword));
    });

    test('Ssid is correctly generated', function() {
      var re = new RegExp('FirefoxHotspot_[a-zA-Z0-9]{10}');
      var generatedSsid = MockNavigatorSettings.mSettings[settingSsid];
      assert.isTrue(re.test(generatedSsid));
    });
  });
});
