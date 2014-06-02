/* global MockCommon, MockCostControl, MockNavigatorMozMobileConnections, Event,
          CostControlApp, Common, MockConfigManager, MockSettingsListener,
          MockMozNetworkStats, MocksHelper
*/
'use strict';

// XXX: As there are two iframes in the body, Firefox adds two indexed items
// in the window object referring to those frames. Mocha considers these
// indices as global leaks so we need to `whitelist` them.
mocha.setup({ globals: ['0', '1'] });
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/test/unit/mock_debug.js');
require('/test/unit/mock_common.js');
require('/test/unit/mock_moz_l10n.js');
require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
require('/test/unit/mock_moz_network_stats.js');
require('/test/unit/mock_settings_listener.js');
require('/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/shared/test/unit/mocks/mock_navigator_moz_icc_manager.js');
require('/test/unit/mock_cost_control.js');
require('/test/unit/mock_config_manager.js');
require('/test/unit/mock_non_ready_screen.js');
require('/js/utils/toolkit.js');
require('/js/view_manager.js');
require('/js/app.js');
require('/js/common.js');
require('/shared/test/unit/load_body_html_helper.js');
require('/shared/test/unit/mocks/mock_accessibility_helper.js');
require('/test/unit/mock_airplane_mode_helper.js');

var realCommon,
    realMozMobileConnections,
    realMozL10n,
    realMozSetMessageHandler,
    realMozNetworkStats,
    realMozIccManager;

if (!window.navigator.mozNetworkStats) {
  window.navigator.mozNetworkStats = null;
}

if (!window.navigator.mozIccManager) {
  window.navigator.mozIccManager = null;
}

if (!window.Common) {
  window.Common = null;
}

if (!window.navigator.mozSetMessageHandler) {
  window.navigator.mozSetMessageHandler = null;
}

if (!window.navigator.mozMobileConnections) {
  window.navigator.mozMobileConnections = null;
}

if (!window.navigator.mozL10n) {
  window.navigator.mozL10n = null;
}

var MocksHelperForUnitTest = new MocksHelper([
  'LazyLoader',
  'AirplaneModeHelper',
  'ConfigManager',
  'CostControl',
  'SettingsListener',
  'NonReadyScreen',
  'AccessibilityHelper'
]).init();

suite('Application Startup Modes Test Suite >', function() {

  MocksHelperForUnitTest.attachTestHelpers();

  suiteSetup(function() {
    realCommon = window.Common;

    realMozMobileConnections = window.navigator.mozMobileConnections;
    window.navigator.mozMobileConnections = MockNavigatorMozMobileConnections;

    realMozL10n = window.navigator.mozL10n;
    window.navigator.mozL10n = window.MockMozL10n;

    realMozSetMessageHandler = window.navigator.mozSetMessageHandler;
    window.navigator.mozSetMessageHandler =
      window.MockNavigatormozSetMessageHandler;
    window.navigator.mozSetMessageHandler.mSetup();

    realMozNetworkStats = window.navigator.mozNetworkStats;
    navigator.mozNetworkStats = MockMozNetworkStats;

    realMozIccManager = window.navigator.mozIccManager;
    navigator.mozIccManager = window.MockNavigatorMozIccManager;
  });

  setup(function() {
    CostControlApp.reset();
    navigator.mozIccManager = window.MockNavigatorMozIccManager;
    window.dispatchEvent(new Event('localized'));
  });

  teardown(function() {
    window.location.hash = '';
  });

  suiteTeardown(function() {
    window.Common = realCommon;
    window.navigator.mozMobileConnections = realMozMobileConnections;
    window.navigator.mozL10n = realMozL10n;
    window.navigator.mozSetMessageHandler.mTeardown();
    window.navigator.mozSetMessageHandler = realMozSetMessageHandler;
    window.navigator.mozNetworkStats = realMozNetworkStats;
    window.navigator.mozIccManager = realMozIccManager;

  });

  function assertNonReadyScreen(done) {
    window.addEventListener('viewchanged', function _onalert(evt) {
      window.removeEventListener('viewchanged', _onalert);
      assert.equal(evt.detail, 'non-ready-screen');
      done();
    });
  }

  function assertFTEStarted(mode, done) {
    window.addEventListener('ftestarted', function _onftestarted(evt) {
      window.removeEventListener('ftestarted', _onftestarted);
      assert.equal(evt.detail, mode);
      done();
    });
  }

  function assertDisplayingOnlyDataUsage() {
    var tabs = document.getElementById('tabs');
    var dataUsageTab = document.getElementById('datausage-tab');

    // Tab zone is hidden and standalone mode for data usage tab is set
    assert.equal(tabs.getAttribute('aria-hidden'), 'true');
    assert.isTrue(dataUsageTab.classList.contains('standalone'));
  }

  function assertDisplayingBalanceTab() {
    var tabs = document.getElementById('tabs');
    var dataUsageTab = document.getElementById('datausage-tab');
    var balanceTab = document.getElementById('balance-tab');
    var balanceTabFilter = document.getElementById('balance-tab-filter');
    var telephonyTabFilter = document.getElementById('telephony-tab-filter');

    // Tab zone is shown, the balance enabler (filter) is shown and the
    // telephony one is hidden.
    assert.notEqual(tabs.getAttribute('aria-hidden'), 'true');
    assert.notEqual(balanceTabFilter.getAttribute('aria-hidden'), 'true');
    assert.equal(telephonyTabFilter.getAttribute('aria-hidden'), 'true');

    // Balance is currently shown
    assert.equal(balanceTab.dataset.viewport, '');

    // Data usage remains on the right
    assert.equal(dataUsageTab.dataset.viewport, 'right');
    assert.isFalse(dataUsageTab.classList.contains('standalone'));
  }

  function assertDisplayingTelephonyTab() {
    var tabs = document.getElementById('tabs');
    var dataUsageTab = document.getElementById('datausage-tab');
    var telephonyTab = document.getElementById('telephony-tab');
    var balanceTabFilter = document.getElementById('balance-tab-filter');
    var telephonyTabFilter = document.getElementById('telephony-tab-filter');

    // Tab zone is shown, the telephony enabler (filter) is shown and the
    // balance one is hidden.
    assert.notEqual(tabs.getAttribute('aria-hidden'), 'true');
    assert.equal(balanceTabFilter.getAttribute('aria-hidden'), 'true');
    assert.notEqual(telephonyTabFilter.getAttribute('aria-hidden'), 'true');

    // Telephony is currently shown
    assert.equal(telephonyTab.dataset.viewport, '');

    // Data usage remains on the right
    assert.equal(dataUsageTab.dataset.viewport, 'right');
    assert.isFalse(dataUsageTab.classList.contains('standalone'));
  }

  function setupCardState(icc) {
    window.Common = new MockCommon();
    window.CostControl = new MockCostControl();
    Common.dataSimIcc = icc;
  }

  test('SIM is not ready', function(done) {
    loadBodyHTML('/index.html');
    setupCardState({cardState: null});

    assertNonReadyScreen(done);

    CostControlApp.init();
  });

  test('Not exist a mandatory API', function(done) {
    loadBodyHTML('/index.html');
    assertNonReadyScreen(done);
    window.navigator.mozIccManager = null;

    CostControlApp.init();
  });

  test('SIM is locked by PIN', function(done) {
    loadBodyHTML('/index.html');
    setupCardState({cardState: 'pinRequired'});

    assertNonReadyScreen(done);

    CostControlApp.init();
  });

  test('SIM is locked by PUK', function(done) {
    loadBodyHTML('/index.html');
    setupCardState({cardState: 'pukRequired'});

    assertNonReadyScreen(done);

    CostControlApp.init();
  });

  test(
    'First Time Experience Loaded when new SIM > DATA_USAGE_ONLY',
    function(done) {
      var applicationMode = 'DATA_USAGE_ONLY';
      setupCardState({cardState: 'ready'});
      window.ConfigManager = new MockConfigManager({
        fakeSettings: { fte: true },
        applicationMode: applicationMode
      });

      assertFTEStarted(applicationMode, done);

      CostControlApp.init();
    }
  );

  test(
    'First Time Experience Loaded when new SIM > PREPAID',
    function(done) {
      var applicationMode = 'PREPAID';
      setupCardState({cardState: 'ready'});
      window.ConfigManager = new MockConfigManager({
        fakeSettings: { fte: true },
        applicationMode: applicationMode
      });

      assertFTEStarted(applicationMode, done);

      CostControlApp.init();
    }
  );

  test(
    'First Time Experience Loaded when new SIM > POSTPAID',
    function(done) {
      var applicationMode = 'POSTPAID';
      setupCardState({cardState: 'ready'});
      window.ConfigManager = new MockConfigManager({
        fakeSettings: { fte: true },
        applicationMode: applicationMode
      });

      assertFTEStarted(applicationMode, done);

      CostControlApp.init();
    }
  );

  function setupLayoutMode(applicationMode) {
    loadBodyHTML('/index.html');
    window.Common = new MockCommon();
    window.CostControl = new MockCostControl();
    window.ConfigManager = new MockConfigManager({
      fakeSettings: { fte: false },
      applicationMode: applicationMode
    });
    Common.dataSimIcc = {cardState: 'ready'};
  }

  test('Layout: Data Usage Only', function(done) {
    setupLayoutMode('DATA_USAGE_ONLY');

    window.addEventListener('tabchanged', function checkAssertions() {
      window.removeEventListener('tabchanged', checkAssertions);
      assertDisplayingOnlyDataUsage();
      done();
    });

    CostControlApp.init();
  });

  test('Layout: Prepaid', function(done) {
    setupLayoutMode('PREPAID');

    window.addEventListener('tabchanged', function checkAssertions() {
      window.removeEventListener('tabchanged', checkAssertions);
      assertDisplayingBalanceTab();
      done();
    });

    CostControlApp.init();
  });

  test('Layout: Postpaid', function(done) {
    setupLayoutMode('POSTPAID');

    window.addEventListener('tabchanged', function checkAssertions() {
      window.removeEventListener('tabchanged', checkAssertions);
      assertDisplayingTelephonyTab();
      done();
    });

    CostControlApp.init();
  });

  test(
    'DSDS Ensure the FTE will be closed when there are a data slot change',
    function(done) {
      MockSettingsListener.mCallbacks['ril.data.defaultServiceId'](0);
      var applicationMode = 'DATA_USAGE_ONLY';
      setupCardState({cardState: 'ready'});
      window.ConfigManager = new MockConfigManager({
        fakeSettings: { fte: true },
        applicationMode: applicationMode
      });

      window.addEventListener('ftestarted', function _onftestarted(evt) {
        window.removeEventListener('ftestarted', _onftestarted);
        var iframe = document.getElementById('fte_view');

        assert.ok(!iframe.classList.contains('non-ready'));

        // The second SIM has FTE passed
        window.ConfigManager = new MockConfigManager({
          fakeSettings: { fte: false },
          applicationMode: applicationMode
        });
        MockSettingsListener.mCallbacks['ril.data.defaultServiceId'](1);

        window.addEventListener('tabchanged', function checkAssertions() {
          window.removeEventListener('tabchanged', checkAssertions);
            iframe = document.getElementById('fte_view');

            assert.ok(iframe.classList.contains('non-ready'));

            done();
        });
      });

      CostControlApp.init();
    }
  );
});
