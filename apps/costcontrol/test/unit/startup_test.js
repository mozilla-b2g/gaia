/* global MockCommon, MockCostControl, MockNavigatorMozMobileConnections, Event,
          CostControlApp, Common, MockConfigManager, asyncStorage,
          MockMozNetworkStats, MocksHelper, SimManager, MockNavigatorSettings,
          AirplaneModeHelper
*/
'use strict';

require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_async_storage.js');
require('/test/unit/mock_debug.js');
require('/test/unit/mock_common.js');
require('/test/unit/mock_moz_l10n.js');
require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
require('/test/unit/mock_moz_network_stats.js');
require('/test/unit/mock_settings_listener.js');
require('/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_navigator_moz_icc_manager.js');
require('/test/unit/mock_cost_control.js');
require('/test/unit/mock_config_manager.js');
require('/test/unit/mock_non_ready_screen.js');
require('/js/utils/toolkit.js');
require('/js/view_manager.js');
require('/js/app.js');
require('/js/common.js');
require('/js/sim_manager.js');
require('/shared/test/unit/load_body_html_helper.js');
require('/shared/test/unit/mocks/mock_accessibility_helper.js');
require('/test/unit/mock_airplane_mode_helper.js');

var realCommon,
    realMozSettings,
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

if (!window.navigator.mozSettings) {
  window.navigator.mozSettings = null;
}

var MocksHelperForUnitTest = new MocksHelper([
  'LazyLoader',
  'asyncStorage',
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

    realMozSettings = navigator.mozSettings;
    window.navigator.mozSettings = MockNavigatorSettings;

    realMozIccManager = window.navigator.mozIccManager;
    navigator.mozIccManager = window.MockNavigatorMozIccManager;
  });

  setup(function() {
    SimManager.reset();
    navigator.mozIccManager = window.MockNavigatorMozIccManager;
    window.dispatchEvent(new Event('localized'));
  });

  teardown(function() {
    CostControlApp.reset();
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
    window.navigator.mozSettings = realMozSettings;
  });

  function assertNonReadyScreen(msg, done) {
    var consoleSpy = sinon.spy(console, 'log');
    window.addEventListener('viewchanged', function _onalert(evt) {
      window.removeEventListener('viewchanged', _onalert);
      assert.equal(evt.detail.id, 'non-ready-screen');
      assert.ok(consoleSpy.calledWith(msg));
      consoleSpy.restore();
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
    assert.ok(tabs.hidden);
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
    assert.ok(!tabs.hidden);
    assert.ok(!balanceTabFilter.hidden);
    assert.ok(telephonyTabFilter.hidden);

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
    assert.ok(!tabs.hidden);
    assert.ok(balanceTabFilter.hidden);
    assert.ok(!telephonyTabFilter.hidden, 'true');

    // Telephony is currently shown
    assert.equal(telephonyTab.dataset.viewport, '');

    // Data usage remains on the right
    assert.equal(dataUsageTab.dataset.viewport, 'right');
    assert.isFalse(dataUsageTab.classList.contains('standalone'));
  }

  function failingRequestDataSIMIccId(onsuccess, onerror) {
    setTimeout(function() {
      (typeof onerror === 'function') && onerror();
    }, 0);
  }

  function setupCardState(icc) {
    window.Common = new MockCommon();
    window.CostControl = new MockCostControl();
    window.MockNavigatorMozIccManager.mTeardown();
    window.MockNavigatorMozIccManager.addIcc('12345', icc);
    MockNavigatorMozMobileConnections[0] = {  iccId: '12345' };
  }

  test('SIM is not ready', function(done) {
    loadBodyHTML('/index.html');
    setupCardState({cardState: null});

    assertNonReadyScreen('NonReadyScreen in state: null', done);

    CostControlApp.init();
  });

  test('Not exist a mandatory API', function(done) {
    loadBodyHTML('/index.html');
    assertNonReadyScreen('NonReadyScreen in state: null', done);
    window.navigator.mozIccManager = null;

    CostControlApp.init();
  });

  test('SIM is locked by PIN', function(done) {
    loadBodyHTML('/index.html');
    setupCardState({cardState: 'pinRequired'});

    assertNonReadyScreen('NonReadyScreen in state: pinRequired', done);

    CostControlApp.init();
  });

  test('SIM is locked by PUK', function(done) {
    loadBodyHTML('/index.html');
    setupCardState({cardState: 'pukRequired'});

    assertNonReadyScreen('NonReadyScreen in state: pukRequired', done);

    CostControlApp.init();
  });

  test('SIM is detected after a non detected SIM on a previous start-up',
    function(done) {
      loadBodyHTML('/index.html');
      this.sinon.spy(window.navigator.mozIccManager, 'addEventListener');

      // The icc request fails, because of this request doesn't work if the
      // airplane mode is enabled.
      sinon.stub(SimManager, 'requestDataSimIcc', failingRequestDataSIMIccId);

      // airplanemode activated for enable the iccmanager listeners
      AirplaneModeHelper._status = 'enabled';

      window.addEventListener('viewchanged', function _onalert(evt) {
        window.removeEventListener('viewchanged', _onalert);

        // Restore the stub method and disabling the airplanemode
        SimManager.requestDataSimIcc.restore();
        AirplaneModeHelper._status = 'disabled';

        // Config the app to start (FTE)
        var applicationMode = 'DATA_USAGE_ONLY';
        setupCardState({cardState: 'ready'});
        window.ConfigManager = new MockConfigManager({
          fakeSettings: { fte: true },
          applicationMode: applicationMode
        });

        // The assertion function contains a listener to detect when the fte is
        // ready, for this reason it must be placed before dispatching the
        // airplanemode disabled event
        assertFTEStarted(applicationMode, done);

        // Launch the second start-up
        var eventDetail = { detail: {serviceId: 'data'}};
        var airplaneModeDisabledEvent =
          new CustomEvent('airplaneModeDisabled', eventDetail);
        window.dispatchEvent(airplaneModeDisabledEvent);
      });

      CostControlApp.init();
  });

  test('SIM is not detected, the icc request is failing',
    function(done) {
      loadBodyHTML('/index.html');

      this.sinon.stub(SimManager, 'requestDataSimIcc',
                      failingRequestDataSIMIccId);

        // Config the app to start (FTE)
        var applicationMode = 'DATA_USAGE_ONLY';
        window.CostControl = new MockCostControl();
        window.ConfigManager = new MockConfigManager({
          applicationMode: applicationMode
        });

      AirplaneModeHelper._status = 'disabled';
      CostControlApp.init();
      assertNonReadyScreen('NonReadyScreen in state: null', done);
  });

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
      done(() => {
        window.removeEventListener('tabchanged', checkAssertions);
        assertDisplayingBalanceTab();
      });
    });

    CostControlApp.init();
  });

  test('Layout: Postpaid', function(done) {
    setupLayoutMode('POSTPAID');

    window.addEventListener('tabchanged', function checkAssertions() {
      done(() => {
        window.removeEventListener('tabchanged', checkAssertions);
        assertDisplayingTelephonyTab();
      });
    });

    CostControlApp.init();
  });

  suite('supportCustomizeMode setting', function() {
    var MockMozAlarms = {
      add: function() {},
      remove: function() {}
    };
    var realMozAlarms;

    suiteSetup(function() {
      realMozAlarms = window.navigator.mozAlarms;
      window.navigator.mozAlarms = MockMozAlarms;
    });

    suiteTeardown(function() {
      window.navigator.mozAlarms = realMozAlarms;
    });

    test('Start up with custom mode when functionality is disabled produces ' +
         'a change to the never mode',
      function(done) {
        var expectedMode = 'never';
        var applicationMode = 'DATA_USAGE_ONLY';
        setupCardState({cardState: 'ready'});
        window.ConfigManager = new MockConfigManager(
          {
            fakeSettings: {
              fte: true,
              trackingPeriod: 'custom'
            },
            applicationMode: applicationMode
          }
        );

        window.addEventListener('ftestarted', function _onftestarted(evt) {
          window.removeEventListener('ftestarted', _onftestarted);
          assert.equal(window.ConfigManager.option('trackingPeriod'),
                       expectedMode);
          done();
        });

        CostControlApp.init();
      }
    );

    test('Start up with custom mode when functionality is disabled remove ' +
         'nextReset alarm',
      function(done) {
        var expectedMode = 'never';
        var nextResetAlarmId = '111';
        var applicationMode = 'DATA_USAGE_ONLY';
        this.sinon.stub(asyncStorage, 'getItem').yields(nextResetAlarmId);
        this.sinon.stub(asyncStorage, 'setItem').yields();
        this.sinon.stub(navigator.mozAlarms, 'remove', function() {});
        setupCardState({cardState: 'ready'});
        window.ConfigManager = new MockConfigManager(
          {
            fakeSettings: {
              fte: true,
              trackingPeriod: 'custom',
              nextReset: new Date()
            },
            applicationMode: applicationMode
          }
        );

        window.addEventListener('ftestarted', function _onftestarted(evt) {
          window.removeEventListener('ftestarted', _onftestarted);
          assert.equal(window.ConfigManager.option('trackingPeriod'),
                       expectedMode);
          sinon.assert.calledWith(navigator.mozAlarms.remove, nextResetAlarmId);
          assert.isNull(window.ConfigManager.option('nextReset'));
          done();
        });

        CostControlApp.init();
      }
    );
  });

  suite('FTE Startup Test Suite >', function() {
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

    var updateUITestCase = [
      {
        description : 'UpdateUI executes the callback after a mode change',
        applicationMode : 'DATA_USAGE_ONLY'
      },
      {
        description :
          'UpdateUI executes the callback even if there is not a mode change',
        applicationMode : null
      }
    ];

    updateUITestCase.forEach(function(testCase) {
      test(testCase.description, function(done) {
        var applicationMode = testCase.applicationMode;
        setupCardState({cardState: 'ready'});
        window.ConfigManager = new MockConfigManager({
          fakeSettings: { fte: true },
          applicationMode: applicationMode
        });
        function _finalizeFTE (evt) {
          window.removeEventListener('ftestarted', _finalizeFTE);
          window.ConfigManager.setOption({ fte: false }, function() {
            window.postMessage({ type: 'fte_finished' },
                               Common.COST_CONTROL_APP);
          });
        }
        window.addEventListener('ftestarted', _finalizeFTE);

        this.sinon.stub(Common, 'closeFTE', done);

        CostControlApp.init();
      });
    });
  });
});
