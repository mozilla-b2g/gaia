/* globals loadBodyHTML,
           MockL10n, MockNavigatorMozMobileConnections
*/

'use strict';

require('/shared/test/unit/load_body_html_helper.js');
require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');

requireApp('settings/test/unit/mock_l10n.js');
requireApp('settings/js/call_barring.js');

suite('Call Barring settings', function() {
  var realMozL10n,
      realMobileConnections;

  suiteSetup(function() {
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    realMobileConnections = navigator.mozMobileConnections;
    navigator.mozMobileConnections = MockNavigatorMozMobileConnections;

    loadBodyHTML('./_call_cb_settings.html');
  });

  suiteTeardown(function() {
    navigator.mozL10n = realMozL10n;
    navigator.mozMobileConnections = realMobileConnections;
  });

  suite('Call Barring >', function() {
    var callBarringMenuItem;

    setup(function() {
    });

    test('call barring available on Call Settings load', function() {
      assert.isNotNull(callBarringMenuItem);
    });
  });

});
