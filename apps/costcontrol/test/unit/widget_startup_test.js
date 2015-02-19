/* global MockCommon, MockCostControl, MockNavigatorMozMobileConnections,
          Widget, MockConfigManager, MockNavigatorMozIccManager, MockMozL10n,
          MockMozNetworkStats, AirplaneModeHelper, MocksHelper,
          CostControl, Formatting, _, SimManager
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
require('/js/sim_manager.js');
require('/js/widget.js');
require('/shared/js/airplane_mode_helper.js');

var realMozMobileConnections,
    realMozL10n,
    realMozNetworkStats,
    realMozIccManager;

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

var MocksHelperForUnitTest = new MocksHelper([
  'LazyLoader',
  'AirplaneModeHelper',
  'ConfigManager',
  'CostControl',
  'SettingsListener',
  'Common'
]).init();

suite('Widget Startup Modes Test Suite >', function() {

  MocksHelperForUnitTest.attachTestHelpers();

  var fte, rightPanel, leftPanel, showSimErrorSpy;
  suiteSetup(function() {

    window.Common = new MockCommon({});

    realMozMobileConnections = window.navigator.mozMobileConnections;

    realMozL10n = window.navigator.mozL10n;
    window.navigator.mozL10n = window.MockMozL10n;

    realMozNetworkStats = window.navigator.mozNetworkStats;

    realMozIccManager = window.navigator.mozIccManager;
  });

  setup(function() {
    navigator.mozIccManager = window.MockNavigatorMozIccManager;
    window.navigator.mozMobileConnections = MockNavigatorMozMobileConnections;
    MockNavigatorMozMobileConnections[0] = {  iccId: '12345' };
    navigator.mozNetworkStats = MockMozNetworkStats;
    AirplaneModeHelper._status = 'disabled';
    loadBodyHTML('/widget.html');
    fte = document.getElementById('fte-view');
    leftPanel = document.getElementById('left-panel');
    rightPanel = document.getElementById('right-panel');
    // Hide all panels
    fte.hidden = true;
    leftPanel.hidden = true;
    rightPanel.hidden = true;
    showSimErrorSpy = this.sinon.spy(Widget, 'showSimError');
  });

  teardown(function() {
    window.location.hash = '';
  });

  suiteTeardown(function() {
    window.navigator.mozMobileConnections = realMozMobileConnections;
    window.navigator.mozL10n = realMozL10n;
    window.navigator.mozNetworkStats = realMozNetworkStats;
    window.navigator.mozIccManager = realMozIccManager;
  });

  function failingRequestDataSIMIccId(onsuccess, onerror) {
    setTimeout(function() {
      (typeof onerror === 'function') && onerror();
    }, 0);
  }

  function setupCardState(costControlConfig) {
    window.CostControl = new MockCostControl(costControlConfig);
  }

  function setupConfig(applicationMode, ftePending, configuration) {
    window.ConfigManager = new MockConfigManager({
      fakeSettings: { fte: ftePending},
      fakeConfiguration: configuration,
      applicationMode: applicationMode
    });
  }

  function assertErrorMessage(errorTag) {
    assert.ok(fte.textContent.trim().contains(errorTag));
    assert.ok(!fte.hidden);
    assert.ok(leftPanel.hidden);
    assert.ok(rightPanel.hidden);
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

  var resultRequestPrepaid = {
    status:'success',
    type:'balance',
    data: {
      timestamp: new Date('2014-04-14T08:35:16.812Z'),
      balance: 22.34,
      currency: '$'
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
    assert.ok(fte.hidden);
    assert.ok(!leftPanel.hidden);
    assert.ok(rightPanel.hidden);
    assert.ok(leftPanel.textContent.trim().contains(dataTag));
  }

  function assertNonDataUseOnlyLayout(leftDataTag, rightDataTag) {
    assert.ok(fte.hidden);
    assert.ok(!leftPanel.hidden);
    assert.ok(!rightPanel.hidden);
    assert.ok(rightPanel.textContent.trim().contains(rightDataTag));
    assert.ok(leftPanel.textContent.trim().contains(leftDataTag));
  }

  function assertFTELayout(dataTag) {
    assert.ok(!fte.hidden);
    assert.ok(leftPanel.hidden);
    assert.ok(rightPanel.hidden);
    assert.ok(fte.textContent.trim().contains(dataTag));
  }

  var listMandatoryAPIs = [
    'mozIccManager', 'mozMobileConnections', 'mozNetworkStats'
  ];

  listMandatoryAPIs.forEach(
    function(mandatoryAPIName) {
      test('Not exists the mandatory API: ' + mandatoryAPIName, function() {
        window.navigator[mandatoryAPIName] = null;

        Widget.init();

        assertErrorMessage('widget-no-sim2-meta');

        assert.ok(showSimErrorSpy.calledOnce);
        assert.ok(showSimErrorSpy.calledWith('no-sim2'));
        showSimErrorSpy.restore();
      });
    }
  );

  test('startup with locked sim', function(done) {
    showSimErrorSpy.restore();
    this.sinon.stub(Widget, 'showSimError', function(errorId) {
      done (function() {
        assert.equal(errorId, 'sim-locked');
      });
    });

    this.sinon.stub(SimManager, 'requestDataSimIcc', function(callback) {
      callback({icc: {cardState: 'pinRequired'} });
    });

    Widget.init();
  });

  test('startup without sim', function(done) {
    showSimErrorSpy.restore();
    this.sinon.stub(Widget, 'showSimError', function(errorId) {
      done (function() {
        assert.equal(errorId, 'no-sim2');
      });
    });

    this.sinon.stub(SimManager, 'requestDataSimIcc', function(callback) {
      callback({icc: {} });
    });

    Widget.init();
  });

  test('Airplane Mode enabled', function(done) {
    // Force loadDataSimIccId to fail
    sinon.stub(SimManager, 'requestDataSimIcc', failingRequestDataSIMIccId);
    sinon.stub(MockMozL10n, 'ready', function(callback) {
      callback();

      assert.ok(showSimErrorSpy.calledOnce);
      assert.ok(showSimErrorSpy.calledWith('airplane-mode'));

      assertErrorMessage('widget-airplane-mode-meta');

      // Restore the spy/stub
      SimManager.requestDataSimIcc.restore();
      MockMozL10n.ready.restore();
      showSimErrorSpy.restore();

      done();
    });

    AirplaneModeHelper._status = 'enabled';

    Widget.init();
  });

  test('SIM is detected after an AirplaneMode message on a previous startup',
    function(done) {
      // Force loadDataSimIccId to fail
      sinon.stub(SimManager, 'requestDataSimIcc', failingRequestDataSIMIccId);

      sinon.stub(MockMozL10n, 'ready', function(callback) {
        callback();

        assert.ok(showSimErrorSpy.calledOnce);
        assert.ok(showSimErrorSpy.calledWith('airplane-mode'));

        assertErrorMessage('widget-airplane-mode-meta');

        // Restore the spy/stub
        SimManager.requestDataSimIcc.restore();
        MockMozL10n.ready.restore();

        // Send a iccdetected event to restart the widget
        AirplaneModeHelper._status = 'disabled';
        setupCardState();
        var ftePending = true;
        var applicationMode = 'DATA_USAGE_ONLY';
        setupConfig(applicationMode, ftePending);

        // In a normal start-up, when the cardState ready, the widget tries to
        // recover de configuration with the method getInstance
        sinon.stub(CostControl, 'getInstance', function(window, callback) {
          assert.equal(showSimErrorSpy.callCount, 1);
          SimManager.requestDataSimIcc(function (dataSimIcc) {
            assert.equal(dataSimIcc.icc.cardState, 'ready');
            CostControl.getInstance.restore();
            showSimErrorSpy.restore();
            done();
          });
        });

        // This event is listen on the function waitForIccAndCheckSim of the
        // widget that calls SimManager.requestDataSIMIcc(checkSIMStatus); to
        // restart the widget
        MockNavigatorMozIccManager.triggerEventListeners('iccdetected', {});
      }
    );

    AirplaneModeHelper._status = 'enabled';
    Widget.init();
  });

  test('fte start-up', function() {

    setupCardState();
    var ftePending = true;
    var applicationMode = 'DATA_USAGE_ONLY';
    setupConfig(applicationMode, ftePending);

    AirplaneModeHelper._status = 'disabled';
    Widget.init();

    assertFTELayout('widget-nonauthed-sim-heading');
  });

  test('normal start-up with DATA_USAGE_ONLY applicationMode', function(done) {
    assert.equal(showSimErrorSpy.notCalled, true);
    var fakeResultDataUsage = {
      datausage: requestDataUsageResult
    };
    var costControlConfig  = newCostControlRequest(fakeResultDataUsage);
    setupCardState(costControlConfig);
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

        SimManager.requestDataSimIcc(function (dataSimIcc) {
          assert.equal(dataSimIcc.icc.cardState, 'ready');

          showSimErrorSpy.restore();
          done();
        });
      }
    });

    AirplaneModeHelper._status = 'disabled';
    Widget.init();
  });

  test('normal start-up with POSTPAID applicationMode', function(done) {
    assert.equal(showSimErrorSpy.notCalled, true);
    sinon.stub(Formatting, 'formatTime', function(timestamp, format) {
      return timestamp;
    });
    var fakePostPaidResult = {
      datausage: requestDataUsageResult,
      telephony: resultRequestPostpaid
    };
    var costControlConfig  = newCostControlRequest(fakePostPaidResult);
    setupCardState(costControlConfig);
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
        var telephonyDataText = _('magnitude', {
          value: telephonyData,
          unit: 'min'
        });

        assertNonDataUseOnlyLayout(mobileDataText, telephonyDataText);

        SimManager.requestDataSimIcc(function (dataSimIcc) {
          assert.equal(dataSimIcc.icc.cardState, 'ready');

          showSimErrorSpy.restore();
          Formatting.formatTime.restore();
          done();
        });
      }
    });

    AirplaneModeHelper._status = 'disabled';
    Widget.init();
  });

  test('normal start-up with PREPAID applicationMode', function(done) {
    assert.equal(showSimErrorSpy.notCalled, true);
    sinon.stub(Formatting, 'formatTime', function(timestamp, format) {
      return timestamp;
    });
    var fakePrePaidResult = {
      datausage: requestDataUsageResult,
      balance: resultRequestPrepaid
    };

    var costControlConfig  = newCostControlRequest(fakePrePaidResult);
    setupCardState(costControlConfig);
    var ftePending = false;
    var applicationMode = 'PREPAID';
    setupConfig(applicationMode, ftePending);

    window.addEventListener('hashchange', function _onHashChange(evt) {
      if (window.location.hash.split('#')[1] === 'updateDone') {
        window.removeEventListener('hashchange', _onHashChange);
        var mobileData =
          Formatting.roundData(fakePrePaidResult.datausage.data.mobile.total);
        var mobileDataText = _('magnitude', {
          value: mobileData[0],
          unit: mobileData[1]
        });

        var balanceDataText = _('currency', {
          value: fakePrePaidResult.balance.data.balance,
          currency: fakePrePaidResult.balance.data.currency
        });
        var balanceView = document.getElementById('balance-view');
        assert.isTrue(balanceView.classList.contains('updating'));

        assertNonDataUseOnlyLayout(mobileDataText, balanceDataText);

        SimManager.requestDataSimIcc(function (dataSimIcc) {
          assert.equal(dataSimIcc.icc.cardState, 'ready');

          showSimErrorSpy.restore();
          Formatting.formatTime.restore();
          done();
        });
      }
    });

    AirplaneModeHelper._status = 'disabled';
    Widget.init();
  });

  test('DSDS start-up after SIM switching: from data usage only SIM to ' +
       'prepaid SIM',
    function(done) {
      /*
        Related to:
          Bug 1128493 - [CostControl] Widget broken after switching data sim
      */

      // SETUP TEST
      var ftePending = false;
      var self = this;
      var fakeResult = {
        datausage: requestDataUsageResult,
        balance: resultRequestPrepaid
      };
      this.sinon.stub(SimManager, 'isMultiSim').returns(true);
      this.sinon.stub(window.CostControl, 'getInstance')
            .yields(newCostControlRequest(fakeResult));

      function assertPrepaidDataLayout() {
        var balanceDataText = _('currency', {
          value: fakeResult.balance.data.balance,
          currency: fakeResult.balance.data.currency
        });
        assertNonDataUseOnlyLayout('', balanceDataText);
        return Promise.resolve();
      }

      function setupDataUsageOnlySIM() {
        return new Promise(function(resolve) {
          setupConfig('DATA_USAGE_ONLY', ftePending);

          // Waiting for the end of the first startup (data_Usage_Only mode)
          window.addEventListener('hashchange', function _onHashChange(evt) {
            var message = window.location.hash.split('#')[1];
            if (message === 'updateDone') {
              window.removeEventListener('hashchange', _onHashChange);
              resolve(done);
            }
          });
        });
      }

      function assertDataUsageOnlyLayout() {
        // right Panel is hidden when data_usage_only mode is loaded
        assert.ok(rightPanel.hidden);
        return Promise.resolve();
      }

      function setupPrepaidSim() {
        return new Promise(function(resolve) {
          self.sinon.stub(window.ConfigManager, 'getApplicationMode',
            function() {
              // updating prepaid configuration
              var fakeConfiguration = {
                balance: {
                  minimum_delay: 3 * 60 * 60 * 1000 // 3h
                },
                is_free: false,
                is_roaming_free: false
              };
              setupConfig('PREPAID', false, fakeConfiguration);
              return 'PREPAID';
            }
          );

          // Waiting for the end of the second startup (with prepaid sim)
          window.addEventListener('hashchange', function _onHashChange(evt) {
            var message = window.location.hash.split('#')[1];
            if (message === 'updateDone') {
              window.removeEventListener('hashchange', _onHashChange);
              resolve(done);
            }
          });

          // Simulating a data slot change
          var serviceSlotChangeEvent = new CustomEvent('dataSlotChange');
          window.dispatchEvent(serviceSlotChangeEvent);
        });
      }

      setupDataUsageOnlySIM()
        .then(assertDataUsageOnlyLayout)
        .then(setupPrepaidSim)
        .then(assertPrepaidDataLayout)
        .catch(function() {
          assert.isTrue(false);
        }).then(done, done);

      AirplaneModeHelper._status = 'disabled';
      Widget.init();
  });
});
