'use strict';

requireApp('costcontrol/test/unit/mock_debug.js');
requireApp('costcontrol/test/unit/mock_moz_mobile_connection.js');
requireApp('costcontrol/test/unit/mock_icc_helper.js');
requireApp('costcontrol/test/unit/mock_config_manager.js');
requireApp('costcontrol/test/unit/mock_settings_listener.js');
requireApp('costcontrol/js/utils/toolkit.js');
requireApp('costcontrol/js/costcontrol.js');

var realSettingsListener,
    realConfigManager,
    realIccHelper,
    realMozMobileConnection;

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

suite('Cost Control Service Hub Suite >', function() {

  suiteSetup(function() {
    realSettingsListener = window.SettingsListener;
    window.SettingsListener = window.MockSettingsListener;

    realConfigManager = window.ConfigManager;

    realIccHelper = window.IccHelper;
    window.IccHelper = new MockIccHelper();

    realMozMobileConnection = window.navigator.mozMobileConnection;
    window.navigator.mozMobileConnection = new MockMozMobileConnection();
  });

  suiteTeardown(function() {
    window.SettingsListener.mTeardown();
    window.SettingsListener = realSettingsListener;
    window.ConfigManager = realConfigManager;
    window.IccHelper = realIccHelper;
    window.navigator.mozMobileConnection = realMozMobileConnection;
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

});
