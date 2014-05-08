/* global MockCommon, MockCostControl, MockNavigatorMozMobileConnections,
          Widget, MockConfigManager, MockNavigatorMozIccManager, MockMozL10n,
          MockMozNetworkStats, AirplaneModeHelper, MocksHelper, Common,
          CostControl, Formatting, _
*/
'use strict';

require('/test/unit/mock_moz_l10n.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/test/unit/mock_debug.js');
require('/js/utils/toolkit.js');
require('/test/unit/mock_common.js');
require('/shared/test/unit/load_body_html_helper.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
require('/test/unit/mock_moz_network_stats.js');
require('/shared/test/unit/mocks/mock_navigator_moz_icc_manager.js');
require('/test/unit/mock_cost_control.js');
require('/test/unit/mock_config_manager.js');
require('/test/unit/mock_airplane_mode_helper.js');
require('/shared/js/lazy_loader.js');
require('/js/views/BalanceView.js');
require('/js/utils/formatting.js');
require('/js/widget.js');
require('/shared/js/airplane_mode_helper.js');

var realMozMobileConnections,
    realMozL10n,
    realMozNetworkStats,
    realMozIccManager,
    realCommon;

if (!window.navigator.mozNetworkStats) {
  window.navigator.mozNetworkStats = null;
}

if (!window.navigator.mozIccManager) {
  window.navigator.mozIccManager = null;
}

if (!window.navigator.mozMobileConnections) {
  window.navigator.mozMobileConnections = null;
}

if (!window.navigator.mozL10n) {
  window.navigator.mozL10n = null;
}

if (!window.Common) {
  window.Common = null;
}

var MocksHelperForUnitTest = new MocksHelper([
  'LazyLoader',
  'AirplaneModeHelper',
  'ConfigManager',
  'CostControl',
  'SettingsListener'
]).init();

suite('Widget Startup Modes Test Suite >', function() {

  MocksHelperForUnitTest.attachTestHelpers();

  var fte, rightPanel, leftPanel;
  suiteSetup(function() {

    realCommon = window.Common;
    window.Common = new MockCommon();

    realMozMobileConnections = window.navigator.mozMobileConnections;

    realMozL10n = window.navigator.mozL10n;
    window.navigator.mozL10n = window.MockMozL10n;

    realMozNetworkStats = window.navigator.mozNetworkStats;

    realMozIccManager = window.navigator.mozIccManager;
  });

  setup(function() {
    navigator.mozIccManager = window.MockNavigatorMozIccManager;
    window.navigator.mozMobileConnections = MockNavigatorMozMobileConnections;
    navigator.mozNetworkStats = MockMozNetworkStats;
    AirplaneModeHelper._status = 'disabled';
    loadBodyHTML('/widget.html');
    fte = document.getElementById('fte-view');
    leftPanel = document.getElementById('left-panel');
    rightPanel = document.getElementById('right-panel');
    // Hide all panels
    fte.setAttribute('aria-hidden', 'true');
    leftPanel.setAttribute('aria-hidden', 'true');
    rightPanel.getAttribute('aria-hidden', 'true');
  });

  teardown(function() {
    window.location.hash = '';
  });

  suiteTeardown(function() {
    window.Common = realCommon;
    window.navigator.mozMobileConnections = realMozMobileConnections;
    window.navigator.mozL10n = realMozL10n;
    window.navigator.mozNetworkStats = realMozNetworkStats;
    window.navigator.mozIccManager = realMozIccManager;
  });

  function failingLoadDataSIMIccId(onsuccess, onerror) {
    setTimeout(function() {
      (typeof onerror === 'function') && onerror();
    }, 0);
  }

  function setupCardState(icc, costControlConfig) {
    window.CostControl = new MockCostControl(costControlConfig);
    Common.dataSimIcc = icc;
  }

  function setupConfig(applicationMode, ftePending) {
    window.ConfigManager = new MockConfigManager({
      fakeSettings: { fte: ftePending},
      applicationMode: applicationMode
    });
  }

  function assertErrorMessage(errorTag) {
    assert.ok(fte.textContent.trim().contains(errorTag));
    assert.equal(fte.getAttribute('aria-hidden'), 'false');
    assert.equal(leftPanel.getAttribute('aria-hidden'), 'true');
    assert.equal(rightPanel.getAttribute('aria-hidden'), 'true');
  }

  var requestDataUsageResult = {
    status: 'success',
    data: {
      mobile: {
        total: 4800543137
      }
    }
  };

  var resultRequestPostpaid = {
    status:'success',
    type:'telephony',
    data: {
      timestamp: { __date__: '2014-04-14T08:35:16.812Z' },
      calltime:100,
      smscount:0
    }
  };

  var newCostControlRequest = function(requestedData) {
    var requestedInfo = requestedData || {};
    return {
      request: function(requestedObj, callback) {
        var resultObj = requestedInfo[requestedObj.type] || {};
        callback(resultObj);
      }
    };
  };

  function assertDataUseOnlyLayout(dataTag) {
    assert.equal(fte.getAttribute('aria-hidden'), 'true');
    assert.equal(leftPanel.getAttribute('aria-hidden'), 'true');
    assert.equal(rightPanel.getAttribute('aria-hidden'), 'false');
    assert.ok(rightPanel.textContent.trim().contains(dataTag));
  }

  function assertPostpaidLayout(leftDataTag, rightDataTag) {
    assert.equal(fte.getAttribute('aria-hidden'), 'true');
    assert.equal(leftPanel.getAttribute('aria-hidden'), 'false');
    assert.equal(rightPanel.getAttribute('aria-hidden'), 'false');
    assert.ok(rightPanel.textContent.trim().contains(rightDataTag));
    assert.ok(leftPanel.textContent.trim().contains(leftDataTag));
  }

  var listMandatoryAPIs = [
    'mozIccManager', 'mozMobileConnections', 'mozNetworkStats'
  ];

  listMandatoryAPIs.forEach(
    function(mandatoryAPIName) {
      test('Not exists the mandatory API: ' + mandatoryAPIName, function() {
        var showSimErrorSpy = sinon.spy(Widget, 'showSimError');
        window.navigator[mandatoryAPIName] = null;

        Widget.init();

        assertErrorMessage('widget-no-sim2-meta');

        assert.ok(showSimErrorSpy.calledOnce);
        assert.ok(showSimErrorSpy.calledWith('no-sim2'));
        showSimErrorSpy.restore();
      });
    }
  );

  test('Airplane Mode enabled', function(done) {
    var showSimErrorSpy = sinon.spy(Widget, 'showSimError');

    // Force loadDataSimIccId to fail
    sinon.stub(Common, 'loadDataSIMIccId', failingLoadDataSIMIccId);
    sinon.stub(MockMozL10n, 'ready', function(callback) {
      callback();

      assert.ok(showSimErrorSpy.calledOnce);
      assert.ok(showSimErrorSpy.calledWith('airplane-mode'));

      assertErrorMessage('widget-airplane-mode-meta');

      // Restore the spy/stub
      Common.loadDataSIMIccId.restore();
      MockMozL10n.ready.restore();
      showSimErrorSpy.restore();

      done();
    });

    AirplaneModeHelper._status = 'enabled';

    Widget.init();
  });

  test('SIM is detected after an AirplaneMode message on a previous startup',
    function(done) {
      var showSimErrorSpy = sinon.spy(Widget, 'showSimError');

      // Force loadDataSimIccId to fail
      sinon.stub(Common, 'loadDataSIMIccId', failingLoadDataSIMIccId);

      sinon.stub(MockMozL10n, 'ready', function(callback) {
        callback();

        assert.ok(showSimErrorSpy.calledOnce);
        assert.ok(showSimErrorSpy.calledWith('airplane-mode'));

        assertErrorMessage('widget-airplane-mode-meta');

        // Restore the spy/stub
        Common.loadDataSIMIccId.restore();
        MockMozL10n.ready.restore();

        // Send a iccdetected event to restart the widget
        AirplaneModeHelper._status = 'disabled';
        setupCardState({cardState: 'ready', iccInfo: true});
        var ftePending = true;
        var applicationMode = 'DATA_USAGE_ONLY';
        setupConfig(applicationMode, ftePending);

        // In a normal start-up, when the cardState ready, the widget tries to
        // recover de configuration with the method getInstance
        sinon.stub(CostControl, 'getInstance', function(window, callback) {
          assert.equal(showSimErrorSpy.callCount, 1);
          assert.equal(Common.dataSimIcc.cardState, 'ready');

          CostControl.getInstance.restore();
          showSimErrorSpy.restore();
          done();
        });

        // This event is listen on the function waitForIccAndCheckSim of the
        // widget that calls Common.loadDataSIMIccId(checkSIMStatus); to restart
        // the widget
        MockNavigatorMozIccManager.triggerEventListeners('iccdetected', {});
      }
    );

    AirplaneModeHelper._status = 'enabled';
    Widget.init();
  });

  test('normal start-up with DATA_USAGE_ONLY applicationMode', function(done) {
    var showSimErrorSpy = sinon.spy(Widget, 'showSimError', function() {
      assert.ok(false);
    });
    var fakeResultDataUsage = {
      datausage: requestDataUsageResult
    };
    var costControlConfig  = newCostControlRequest(fakeResultDataUsage);
    setupCardState({cardState: 'ready', iccInfo: true}, costControlConfig);
    var ftePending = false;
    var applicationMode = 'DATA_USAGE_ONLY';
    setupConfig(applicationMode, ftePending);

    window.addEventListener('hashchange', function _onHashChange(evt) {
      if (window.location.hash.split('#')[1] === 'updateDone') {
        window.removeEventListener('hashchange', _onHashChange);
        var mobileData =
          Formatting.roundData(fakeResultDataUsage.datausage.data.mobile.total);
        var mobileDataText = _('magnitude', {
          value: mobileData[0],
          unit: mobileData[1]
        });
        assertDataUseOnlyLayout(mobileDataText);

        assert.equal(Common.dataSimIcc.cardState, 'ready');

        showSimErrorSpy.restore();
        done();
      }
    });

    AirplaneModeHelper._status = 'disabled';
    Widget.init();
  });

  test('normal start-up with POSTPAID applicationMode', function(done) {
    var showSimErrorSpy = sinon.spy(Widget, 'showSimError', function() {
      assert.ok(false);
    });
    sinon.stub(Formatting, 'formatTime', function(timestamp, format) {
      return timestamp;
    });
    var fakePostPaidResult = {
      datausage: requestDataUsageResult,
      telephony: resultRequestPostpaid
    };
    var costControlConfig  = newCostControlRequest(fakePostPaidResult);
    setupCardState({cardState: 'ready', iccInfo: true}, costControlConfig);
    var ftePending = false;
    var applicationMode = 'POSTPAID';
    setupConfig(applicationMode, ftePending);

    window.addEventListener('hashchange', function _onHashChange(evt) {
      if (window.location.hash.split('#')[1] === 'updateDone') {
        window.removeEventListener('hashchange', _onHashChange);
        var mobileData =
          Formatting.roundData(fakePostPaidResult.datausage.data.mobile.total);
        var mobileDataText = _('magnitude', {
          value: mobileData[0],
          unit: mobileData[1]
        });

        var telephonyData =
          Formatting.computeTelephonyMinutes(fakePostPaidResult.telephony.data);
        var telephonyDataText =  _('magnitude', {
          value: telephonyData,
          unit: 'min'
        });

        assertPostpaidLayout(telephonyDataText, mobileDataText);
        assert.equal(Common.dataSimIcc.cardState, 'ready');

        showSimErrorSpy.restore();
        Formatting.formatTime.restore();
        done();
      }
    });

    AirplaneModeHelper._status = 'disabled';
    Widget.init();
  });



});
