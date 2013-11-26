'use strict';

requireApp('costcontrol/test/unit/mock_debug.js');
requireApp('costcontrol/test/unit/mock_common.js');
requireApp('costcontrol/test/unit/mock_moz_mobile_connection.js');
requireApp('costcontrol/test/unit/mock_icc_helper.js');
requireApp('costcontrol/test/unit/mock_config_manager.js');
requireApp('costcontrol/test/unit/mock_settings_listener.js');
requireApp('costcontrol/test/unit/mock_moz_network_stats.js');
requireApp('costcontrol/js/networkstats_proxy.js');
requireApp('costcontrol/js/utils/toolkit.js');
requireApp('costcontrol/js/costcontrol.js');

var realCommon,
    realMozNetworkStats,
    realSettingsListener,
    realConfigManager,
    realIccHelper,
    realMozMobileConnection,
    realNetworkstatsProxy;

if (!this.SettingsListener) {
  this.SettingsListener = null;
}

if (!this.ConfigManager) {
  this.ConfigManager = null;
}

if (!this.IccHelper) {
  this.IccHelper = null;
}

if (!this.navigator.mozMobileConnection) {
  this.navigator.mozMobileConnection = null;
}

if (!this.NetworkstatsProxy) {
  this.NetworkstatsProxy = null;
}

if (!this.navigator.mozNetworkStats) {
  this.navigator.mozNetworkStats = null;
}

if (!this.Common) {
  this.Common = null;
}


suite('Cost Control Service Hub Suite >', function() {

  suiteSetup(function() {
    realSettingsListener = window.SettingsListener;
    window.SettingsListener = window.MockSettingsListener;

    realConfigManager = window.ConfigManager;

    realCommon = window.Common;
    window.Common = new MockCommon({ isValidICCID: true });

    realIccHelper = window.IccHelper;
    window.IccHelper = new MockIccHelper();

    realMozMobileConnection = window.navigator.mozMobileConnection;
    window.navigator.mozMobileConnection = new MockMozMobileConnection();

    realNetworkstatsProxy = window.NetworkstatsProxy;
    window.NetworkstatsProxy = MockMozNetworkStats;

    realMozNetworkStats = window.navigator.mozNetworkStats;
    navigator.mozNetworkStats = MockMozNetworkStats;

  });

  suiteTeardown(function() {
    window.SettingsListener.mTeardown();
    window.SettingsListener = realSettingsListener;
    window.ConfigManager = realConfigManager;
    window.IccHelper = realIccHelper;
    window.navigator.mozMobileConnection = realMozMobileConnection;
    window.navigator.mozNetworkStats = realMozNetworkStats;
    window.Common = realCommon;
    window.NetworkstatsProxy = realNetworkstatsProxy;
  });

  function setupDelaySinceLastBalance(lastBalanceRequest, delay) {
    window.ConfigManager = new MockConfigManager({
      applicationMode: 'PREPAID',
      fakeConfiguration: {
        balance: {
          minimum_delay: delay
        }
      },
      fakeSettings: {
        lastBalanceRequest: lastBalanceRequest
      }
    });
  }

  function setupInsufficentDelaySinceLastBalance() {
    var age = 60 * 1000;
    var lastBalanceRequest = new Date();
    lastBalanceRequest.setTime(lastBalanceRequest.getTime() - age);
    var delay = age * 2;

    setupDelaySinceLastBalance(lastBalanceRequest, delay);
  }

  function setupEnoughDelaySinceLastBalance() {
    var age = 60 * 1000;
    var lastBalanceRequest = new Date();
    lastBalanceRequest.setTime(lastBalanceRequest.getTime() - age);
    var delay = Math.floor(age / 2);

    setupDelaySinceLastBalance(lastBalanceRequest, delay);
  }

  test(
    'Balance requests fail when not enough delay since the last request',
    function(done) {
      setupInsufficentDelaySinceLastBalance();

      CostControl.init();
      CostControl.getInstance(function(service) {
        service.request({type: 'balance'}, function(result) {
          assert.equal(result.status, 'error');
          assert.equal(result.details, 'minimum_delay');
          done();
        });
      });
    }
  );

  test(
    'Balance requests doesn\'t fail if enough delay since the last request',
    function(done) {
      setupEnoughDelaySinceLastBalance();

      CostControl.init();
      CostControl.getInstance(function(service) {
        service.request({type: 'balance'}, function(result) {
          assert.notEqual(result.details, 'minimum_delay');
          done();
        });
      });
    }
  );

  test(
    'Get dataUsage correctly',
    function(done) {
      CostControl.init();
      CostControl.getInstance(function(service) {
        service.request({type: 'datausage'}, function(result) {

          assert.equal(result.status, 'success');
          assert.equal(result.data.wifi.total, 112123944);
          assert.equal(result.data.mobile.total, 4800543137);

          done();
        });
      });
    }
  );

  test(
    'Get dataUsage without simcard interface',
    function(done) {
      sinon.stub(Common, 'getDataSIMInterface').returns(undefined);

      CostControl.init();
      CostControl.getInstance(function(service) {
        service.request({type: 'datausage'}, function(result) {
          assert.equal(result.status, 'success');
          assert.equal(result.data.wifi.total, 112123944);
          assert.equal(result.data.mobile.total, 0);
          Common.getDataSIMInterface.restore();
          done();
        });
      });
    }
  );

  test(
    'Get dataUsage without network interfaces',
    function(done) {
      sinon.stub(Common, 'getDataSIMInterface').returns(undefined);
      sinon.stub(Common, 'getWifiInterface').returns(undefined);

      CostControl.init();
      CostControl.getInstance(function(service) {
        service.request({type: 'datausage'}, function(result) {
          assert.equal(result.status, 'success');
          assert.equal(result.data.wifi.total, 0);
          assert.equal(result.data.mobile.total, 0);

          Common.getDataSIMInterface.restore();
          Common.getWifiInterface.restore();
          done();
        });
      });
    }
  );
});
