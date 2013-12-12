/*global Hotspot, loadBodyHTML, MockNavigatorSettings, MocksHelper, MockL10n */

'use strict';

require('/js/hotspot.js');
require('/js/hotspot_wifi_settings.js');
require('/test/unit/mock_navigator_settings.js');
require('/shared/test/unit/mocks/mocks_helper.js');
require('/test/unit/mock_l10n.js');

suite('Hotspot', function() {
  var realMozL10n;
  var realNavigatorSettings;

  suiteSetup(function() {
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    realNavigatorSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    var html =
      '<div id="hotspot">' +
        '<ul>' +
          '<li id="hotspot-settings-section">' +
            '<label>' +
              '<button class="icon icon-view"' +
              'data-l10n-id="hotspotSettings">Hotspot Settings</button>' +
            '</label>' +
          '</li>' +
          '<li class="password-item" hidden>' +
            '<a data-l10n-id="wifi-password">Password' +
              '<span data-name="tethering.wifi.security.password"></span>' +
            '</a>' +
          '</li>' +
        '</ul>' +
      '</div>';

    document.body.insertAdjacentHTML('beforeend', html);
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
    var setting = 'tethering.wifi.security.password';

    setup(function() {
      this.sinon.useFakeTimers();
      Hotspot.init();
      this.sinon.clock.tick();
    });

    test('password is correctly generated', function() {
      var re = new RegExp('[a-z]+[0-9]{4}');
      var generatedPassword = MockNavigatorSettings.mSettings[setting];
      assert.isTrue(re.test(generatedPassword));
    });
  });
});
