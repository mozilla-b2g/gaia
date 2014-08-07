/* global MocksHelper, MockNavigatorMozMobileConnections, MockL10n,
          MockNavigatormozApps, AppManager, MockNavigatormozApps */

'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_apps.js');
require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');

requireApp('ftu/test/unit/mock_l10n.js');
requireApp('ftu/test/unit/mock_version_helper.js');
requireApp('ftu/test/unit/mock_tutorial.js');
requireApp('ftu/test/unit/mock_sim_manager.js');
requireApp('ftu/test/unit/mock_wifi_manager.js');
requireApp('ftu/test/unit/mock_import_services.js');
requireApp('ftu/test/unit/mock_time_manager.js');
requireApp('ftu/test/unit/mock_ui_manager.js');
requireApp('ftu/test/unit/mock_navigation.js');
requireApp('ftu/test/unit/mock_data_mobile.js');

suite('AppManager >', function() {
  var mocksHelperForAppManager = new MocksHelper([
    'Tutorial',
    'VersionHelper',
    'SimManager',
    'WifiManager',
    'ImportIntegration',
    'TimeManager',
    'UIManager',
    'Navigation',
    'DataMobile'
  ]).init();

  var realL10n;
  var realMozMobileConnections;
  var realMozApps;

  suiteSetup(function(done) {
    realMozMobileConnections = navigator.mozMobileConnections;
    navigator.mozMobileConnections = MockNavigatorMozMobileConnections;

    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    realMozApps = navigator.mozApps;
    navigator.mozApps = MockNavigatormozApps;
    mocksHelperForAppManager.suiteSetup();
    // also call setup the first time
    mocksHelperForAppManager.setup();

    requireApp('ftu/js/app.js', done);
  });

  suiteTeardown(function() {
    mocksHelperForAppManager.suiteTeardown();
    navigator.mozMobileConnections = realMozMobileConnections;
    realMozMobileConnections = null;

    navigator.mozL10n = realL10n;
    realL10n = null;

    navigator.mozApps = realMozApps;
  });

  teardown(function() {
    MockNavigatormozApps.mTeardown();
  });

  test('IAC Message > will send message', function() {
    AppManager.init();
    MockNavigatormozApps.mTriggerLastRequestSuccess();
    assert.equal(MockNavigatormozApps.mLastConnectionKeyword,
                 'setup');
  });

});
