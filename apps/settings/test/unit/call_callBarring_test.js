/* globals loadBodyHTML,
           MockL10n, MockNavigatorSettings, MockNavigatorMozMobileConnections,
           CallSettings, DsdsSettings
*/

'use strict';

require('/shared/test/unit/load_body_html_helper.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');

requireApp('settings/test/unit/mock_l10n.js');
requireApp('settings/js/dsds_settings.js');
requireApp('settings/js/call.js');

suite('Call Barring settings', function() {
  var realMozL10n,
      realMozSettings,
      realMobileConnections;

  suiteSetup(function() {
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    realMobileConnections = navigator.mozMobileConnections;
    navigator.mozMobileConnections = MockNavigatorMozMobileConnections;

    loadBodyHTML('./_call_cb_settings.html');
  });

  suiteTeardown(function() {
    navigator.mozL10n = realMozL10n;
    navigator.mozSettings = realMozSettings;
    navigator.mozMobileConnections = realMobileConnections;
  });

  suite('Call Barring >', function() {
    var callBarringMenuItem;

    setup(function() {
      callBarringMenuItem = document.getElementById('menuItem-callBarring');
      DsdsSettings.init();
      CallSettings.init();
    });

    test('call barring available on Call Settings load', function() {
      assert.isNotNull(callBarringMenuItem);
    });
  });

});
