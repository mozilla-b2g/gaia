'use strict';

// XXX: As there are two iframes in the body, Firefox adds two indexed items
// in the window object referring to those frames. Mocha considers these
// indices as global leaks so we need to `whitelist` them.
mocha.setup({ globals: ['0', '1'] });

requireApp('costcontrol/test/unit/mock_debug.js');
requireApp('costcontrol/test/unit/mock_common.js');
requireApp('costcontrol/test/unit/mock_moz_l10n.js');
requireApp('costcontrol/test/unit/mock_moz_mobile_connection.js');
requireApp('costcontrol/test/unit/mock_moz_set_message_handler.js');
requireApp('costcontrol/test/unit/mock_cost_control.js');
requireApp('costcontrol/test/unit/mock_config_manager.js');
requireApp('costcontrol/js/utils/toolkit.js');
requireApp('costcontrol/js/view_manager.js');
requireApp('costcontrol/js/app.js');
require('/shared/test/unit/load_body_html_helper.js');

var realCommon,
    realMozMobileConnection,
    realMozL10n,
    realCostControl,
    realConfigManager,
    realMozSetMessageHandler;

if (!this.Common) {
  this.Common = null;
}

if (!this.navigator.mozMobileConnection) {
  this.navigator.mozMobileConnection = null;
}

if (!this.navigator.mozL10n) {
  this.navigator.mozL10n = null;
}

if (!this.CostControl) {
  this.CostControl = null;
}

if (!this.ConfigManager) {
  this.ConfigManager = null;
}

if (!this.navigator.mozSetMessageHandler) {
  this.navigator.mozSetMessageHandler = null;
}

suite('Application Startup Modes Test Suite >', function() {

  suiteSetup(function() {
    realCommon = window.Common;

    realMozMobileConnection = window.navigator.mozMobileConnection;

    realMozL10n = window.navigator.mozL10n;
    window.navigator.mozL10n = window.MockMozL10n;

    realCostControl = window.CostControl;

    realConfigManager = window.ConfigManager;

    realMozSetMessageHandler = window.navigator.mozSetMessageHandler;
    window.navigator.mozSetMessageHandler = window.MockMozSetMessageHandler;
  });

  setup(function() {
    CostControlApp.reset();
    window.dispatchEvent(new Event('localized'));
  });

  suiteTeardown(function() {
    window.Common = realCommon;
    window.navigator.mozMobileConnection = realMozMobileConnection;
    window.navigator.mozL10n = realMozL10n;
    window.CostControl = realCostControl;
    window.ConfigManager = realConfigManager;
    window.navigator.mozSetMessageHandler = realMozSetMessageHandler;
  });

  function assertAlertMessageAndClose(msg, done) {
    var expectedEvents = 2;
    function checkDone() {
      expectedEvents--;
      if (expectedEvents === 0) {
        done();
      }
    }
    window.addEventListener('fakealert', function _onalert(evt) {
      window.removeEventListener('fakealert', _onalert);
      assert.equal(evt.detail, msg);
      checkDone();
    });
    window.addEventListener('appclosed', function _onappclosed() {
      window.removeEventListener('appclosed', _onappclosed);
      checkDone();
    });
  }

  function assertFTEStarted(done) {
    window.addEventListener('ftestarted', function _onftestarted() {
      window.removeEventListener('ftestarted', _onftestarted);
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

  function setupCardState(cardState) {
    window.Common = new MockCommon({ isValidICCID: true });
    window.CostControl = new MockCostControl();
    window.navigator.mozMobileConnection = new MockMozMobileConnection({
      cardState: cardState
    });
  }

  test('SIM is not ready', function(done) {
    setupCardState('absent');

    assertAlertMessageAndClose(
      'widget-no-sim2-heading\nwidget-no-sim2-meta',
      done
    );

    CostControlApp.init();
  });

  test('SIM is locked by PIN', function(done) {
    setupCardState('pinRequired');

    assertAlertMessageAndClose(
      'widget-sim-locked-heading\nwidget-sim-locked-meta',
      done
    );

    CostControlApp.init();
  });

  test('SIM is locked by PUK', function(done) {
    setupCardState('pukRequired');

    assertAlertMessageAndClose(
      'widget-sim-locked-heading\nwidget-sim-locked-meta',
      done
    );

    CostControlApp.init();
  });

  test('First Time Experience Loaded when new SIM', function(done) {
    setupCardState('ready');
    window.ConfigManager = new MockConfigManager({
      fakeSettings: { fte: true },
      applicationMode: 'DATA_USAGE_ONLY'
    });

    assertFTEStarted(done);

    CostControlApp.init();
  });

  function setupLayoutMode(applicationMode) {
    loadBodyHTML('/index.html');
    window.Common = new MockCommon({ isValidICCID: true });
    window.CostControl = new MockCostControl();
    window.navigator.mozMobileConnection = new MockMozMobileConnection({
      cardState: 'ready'
    });
    window.ConfigManager = new MockConfigManager({
      fakeSettings: { fte: false },
      applicationMode: applicationMode
    });
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

});
