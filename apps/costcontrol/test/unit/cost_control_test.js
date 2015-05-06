/* global MockCommon, MocksHelper, MockConfigManager, Common, SimManager,
          MockMozNetworkStats, MockNavigatorMozMobileConnections, CostControl
*/
'use strict';

require('/test/unit/mock_debug.js');
require('/test/unit/mock_common.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/test/unit/mock_airplane_mode_helper.js');
require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
require('/test/unit/mock_config_manager.js');
require('/test/unit/mock_moz_network_stats.js');
require('/js/utils/toolkit.js');
require('/js/sim_manager.js');
require('/js/costcontrol.js');

var realMozNetworkStats,
    realMozMobileConnections;

if (!window.navigator.mozMobileConnections) {
  window.navigator.mozMobileConnections = null;
}

if (!window.navigator.mozNetworkStats) {
  window.navigator.mozNetworkStats = null;
}

var MocksHelperForUnitTest = new MocksHelper([
  'AirplaneModeHelper',
  'Common',
  'ConfigManager',
  'LazyLoader'

]).init();

suite('Cost Control Service Hub Suite >', function() {

  MocksHelperForUnitTest.attachTestHelpers();

  suiteSetup(function() {

    window.Common = new MockCommon({});

    realMozMobileConnections = navigator.mozMobileConnections;
    window.navigator.mozMobileConnections = MockNavigatorMozMobileConnections;

    realMozNetworkStats = window.navigator.mozNetworkStats;
    navigator.mozNetworkStats = MockMozNetworkStats;

  });

  suiteTeardown(function() {
    window.navigator.mozMobileConnections = realMozMobileConnections;
    window.navigator.mozNetworkStats = realMozNetworkStats;
  });

  teardown(function() {
    CostControl.reset();
  });

  function setupDelaySinceLastBalance(lastBalanceRequest, delay,
                                      applicationMode) {
    applicationMode = applicationMode || 'PREPAID';
    MockNavigatorMozMobileConnections[0] = {
      voice: { connected: true, relSignalStrength: 60 },
      data: {}
    };
    window.ConfigManager = new MockConfigManager({
      applicationMode: applicationMode,
      fakeConfiguration: {
        balance: {
          minimum_delay: delay
        },
        is_free: true,
        is_roaming_free: false
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

  function setupEnoughDelaySinceLastBalance(applicationMode) {
    var age = 60 * 1000;
    var lastBalanceRequest = new Date();
    lastBalanceRequest.setTime(lastBalanceRequest.getTime() - age);
    var delay = Math.floor(age / 2);

    setupDelaySinceLastBalance(lastBalanceRequest, delay, applicationMode);
  }

  function setupNonFreeMessage() {
    var age = 60 * 1000;
    var lastBalanceRequest = new Date();
    lastBalanceRequest.setTime(lastBalanceRequest.getTime() - age);
    var delay = Math.floor(age / 2);

    MockNavigatorMozMobileConnections[0] = {
      voice: { connected: true, relSignalStrength: 60 },
      data: {}
    };
    window.ConfigManager = new MockConfigManager({
      applicationMode: 'PREPAID',
      fakeConfiguration: {
        balance: {
          minimum_delay: delay
        },
        is_free: false,
        is_roaming_free: false
      },
      fakeSettings: {
        lastBalanceRequest: lastBalanceRequest
      }
    });
  }

  function setupWaitingForRequest() {
    var age = 60 * 1000;
    var lastRequest = new Date();
    lastRequest.setTime(lastRequest.getTime() - age);
    var delay = Math.floor(age / 2);

    MockNavigatorMozMobileConnections[0] = {
      voice: { connected: true, relSignalStrength: 60 },
      data: {}
    };
    window.ConfigManager = new MockConfigManager({
      applicationMode: 'PREPAID',
      fakeConfiguration: {
        balance: {
          minimum_delay: delay
        },
        is_free: true,
        is_roaming_free: false
      },
      fakeSettings: {
        lastBalanceRequest: lastRequest,
        lastTopUpRequest: lastRequest,
        waitingForTopUp: true,
        waitingForBalance: true
      }
    });
  }

  test(
    'Balance requests fail when not enough delay since the last request',
    function(done) {
      setupInsufficentDelaySinceLastBalance();

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

      CostControl.getInstance(function(service) {
        service.request({type: 'balance'}, function(result) {
          assert.notEqual(result.details, 'minimum_delay');
          done();
        });
      });
    }
  );

  test(
    'Balance requests fail when not signal is detected',
    function(done) {
      setupEnoughDelaySinceLastBalance();
      MockNavigatorMozMobileConnections[0] = {
        voice: { connected: true, relSignalStrength: null },
        data: {}
      };

      CostControl.getInstance(function(service) {
        service.request({type: 'balance'}, function(result) {
          assert.equal(result.status, 'error');
          assert.equal(result.details, 'no_coverage');
          done();
        });
      });
    }
  );

  test(
    'Balance requests fail when not exist voice service',
    function(done) {
      setupEnoughDelaySinceLastBalance();
      MockNavigatorMozMobileConnections[0] = {
        data: {}
      };

      CostControl.getInstance(function(service) {
        service.request({type: 'balance'}, function(result) {
          assert.equal(result.status, 'error');
          assert.equal(result.details, 'no_service');
          done();
        });
      });
    }
  );

  test(
    'Balance requests fail when applicationMode is not PREPAID',
    function(done) {
      setupEnoughDelaySinceLastBalance('POSTPAID');

      CostControl.getInstance(function(service) {
        service.request({type: 'balance'}, function(result) {
          assert.equal(result.status, 'error');
          assert.equal(result.details, 'no_service');
          done();
        });
      });
    }
  );

  test(
    'Balance requests fail when message is not free',
    function(done) {
      setupNonFreeMessage();

      CostControl.getInstance(function(service) {
        service.request({type: 'balance'}, function(result) {
          assert.equal(result.status, 'error');
          assert.equal(result.details, 'non_free');
          done();
        });
      });
    }
  );

  test(
    'Balance requests fail when roaming msg is not free',
    function(done) {
      setupEnoughDelaySinceLastBalance();
      MockNavigatorMozMobileConnections[0] = {
        voice: {
          connected: true,
          relSignalStrength: 60,
          roaming: true
        },
        data: {}
      };

      CostControl.getInstance(function(service) {
        service.request({type: 'balance'}, function(result) {
          assert.equal(result.status, 'error');
          assert.equal(result.details, 'non_free_in_roaming');
          done();
        });
      });
    }
  );

  test(
    'TopUp requests does not fail when is waiting for TopUp',
    function(done) {
      setupWaitingForRequest();

      CostControl.getInstance(function(service) {
        service.request({type: 'topup'}, function(result) {
          assert.equal(result.status, 'in_progress');
          done();
        });
      });
    }
  );

  test(
    'TopUp requests fail when not exist voice service',
    function(done) {
      setupEnoughDelaySinceLastBalance();
      MockNavigatorMozMobileConnections[0] = {
        data: {}
      };

      CostControl.getInstance(function(service) {
        service.request({type: 'topup'}, function(result) {
          assert.equal(result.status, 'error');
          assert.equal(result.details, 'no_service');
          done();
        });
      });
    }
  );

  test(
    'TopUp requests fail when applicationMode is not PREPAID',
    function(done) {
      setupEnoughDelaySinceLastBalance('POSTPAID');

      CostControl.getInstance(function(service) {
        service.request({type: 'topup'}, function(result) {
          assert.equal(result.status, 'error');
          assert.equal(result.details, 'no_service');
          done();
        });
      });
    }
  );

  test(
    'TopUp requests fail when roaming msg is not free',
    function(done) {
      setupEnoughDelaySinceLastBalance();
      MockNavigatorMozMobileConnections[0] = {
        voice: {
          connected: true,
          relSignalStrength: 60,
          roaming: true
        },
        data: {}
      };

      CostControl.getInstance(function(service) {
        service.request({type: 'topup'}, function(result) {
          assert.equal(result.status, 'error');
          assert.equal(result.details, 'non_free_in_roaming');
          done();
        });
      });
    }
  );

  test(
    'Get dataUsage correctly',
    function(done) {
      sinon.stub(SimManager, 'requestDataSimIcc', function (callback) {
        (typeof callback === 'function') && callback({iccId:'12345'});
      });
      CostControl.getInstance(function(service) {
        service.request({type: 'datausage'}, function(result) {
          assert.equal(result.status, 'success');
          assert.equal(result.data.wifi.total, 112123944);
          assert.equal(result.data.mobile.total, 4800543137);
          assert.equal(Object.keys(result.data.mobile.apps).length, 0);
          SimManager.requestDataSimIcc.restore();
          done();
        });
      });
    }
  );

  test(
    'Get dataUsage without simcard interface',
    function(done) {
      sinon.stub(Common, 'getDataSIMInterface').returns(undefined);
      sinon.stub(SimManager, 'requestDataSimIcc', function (callback) {
        (typeof callback === 'function') && callback({iccId:'12345'});
      });

      CostControl.getInstance(function(service) {
        service.request({type: 'datausage'}, function(result) {
          assert.equal(result.status, 'success');
          assert.equal(result.data.wifi.total, 112123944);
          assert.equal(result.data.mobile.total, 0);
          Common.getDataSIMInterface.restore();
          SimManager.requestDataSimIcc.restore();
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
      sinon.stub(SimManager, 'requestDataSimIcc', function (callback) {
        (typeof callback === 'function') && callback({iccId:'12345'});
      });

      CostControl.getInstance(function(service) {
        service.request({type: 'datausage'}, function(result) {
          assert.equal(result.status, 'success');
          assert.equal(result.data.wifi.total, 0);
          assert.equal(result.data.mobile.total, 0);

          Common.getDataSIMInterface.restore();
          Common.getWifiInterface.restore();
          SimManager.requestDataSimIcc.restore();
          done();
        });
      });
    }
  );

  test(
    'Get dataUsage works with date parameters',
    function(done) {
      var startDate = new Date(2012, 11, 20);
      var endDate = new Date(2013, 0, 7);
      var requestParameters =
        {type: 'datausage', startDate: startDate, endDate: endDate};

      this.sinon.stub(SimManager, 'requestDataSimIcc', function (callback) {
        (typeof callback === 'function') && callback({iccId:'12345'});
      });

      this.sinon.spy(window.navigator.mozNetworkStats, 'getSamples');
      CostControl.getInstance(function(service) {
        service.request(requestParameters, function(result) {
          done(function() {
            sinon.assert.calledWith(window.navigator.mozNetworkStats.getSamples,
              Common.getWifiInterface(), startDate, endDate);
          });
        });
      });
    }
  );

  test(
    'Get dataUsage when start date is higher than end date',
    function(done) {
      var startDate = new Date(2012, 11, 20);
      var endDate = new Date(2012, 11, 13);
      var endDateExpected =  new Date(2012, 11, 21);
      var requestParameters =
        {type: 'datausage', startDate: startDate, endDate: endDate};

      this.sinon.stub(SimManager, 'requestDataSimIcc', function (callback) {
        (typeof callback === 'function') && callback({iccId:'12345'});
      });

      this.sinon.spy(window.navigator.mozNetworkStats, 'getSamples');
      CostControl.getInstance(function(service) {
        service.request(requestParameters, function(result) {
          done(function() {
            sinon.assert.calledWith(window.navigator.mozNetworkStats.getSamples,
              Common.getWifiInterface(), startDate, endDateExpected);
          });
        });
      });
    }
  );


  test(
    'Get datausage per app',
    function(done) {
      var expectedLastDataUsage = {
        mobile: { total: 10000, apps: {} },
        wifi: { total: 20000, apps: {} }
      };

      var fakeSettings = { lastDataUsage: expectedLastDataUsage };

      sinon.stub(SimManager, 'requestDataSimIcc', function (callback) {
        (typeof callback === 'function') && callback({iccId:'12345'});
      });

      window.ConfigManager = new MockConfigManager({
        fakeSettings: fakeSettings
      });

      CostControl.getInstance(function(service) {
        var manifests = [MockMozNetworkStats.APP_MANIFEST_1,
                         MockMozNetworkStats.APP_MANIFEST_2];
        service.request({type: 'datausage', apps: manifests}, function(result) {
          assert.equal(result.status, 'success');
          assert.equal(Object.keys(result.data.mobile.apps).length, 2);

          var apps = result.data.mobile.apps;
          var app1 = apps[MockMozNetworkStats.APP_MANIFEST_1];
          var app2 = apps[MockMozNetworkStats.APP_MANIFEST_2];

          assert.equal(app1.total, 1047);
          assert.equal(app2.total, 2268);
          assert.equal(result.data.mobile.total, app1.total + app2.total);

          assert.equal(
            fakeSettings.lastDataUsage.mobile.total,
            expectedLastDataUsage.mobile.total
          );

          SimManager.requestDataSimIcc.restore();
          done();
        });
      });
    }
  );

  test(
    'Get datausage per app shows browser App',
    function(done) {
      var expectedLastDataUsage = {
        mobile: { total: 10000, apps: {} },
        wifi: { total: 20000, apps: {} }
      };

      var fakeSettings = { lastDataUsage: expectedLastDataUsage };

      this.sinon.stub(SimManager, 'requestDataSimIcc', function (callback) {
        (typeof callback === 'function') && callback({iccId:'12345'});
      });

      window.ConfigManager = new MockConfigManager({
        fakeSettings: fakeSettings
      });

      CostControl.getInstance(function(service) {
        var manifests = [MockMozNetworkStats.APP_MANIFEST_1,
                         Common.BROWSER_APP.manifestURL];
        service.request({type: 'datausage', apps: manifests}, function(result) {
          assert.equal(result.status, 'success');
          assert.equal(Object.keys(result.data.mobile.apps).length, 2);

          var apps = result.data.mobile.apps;
          var app1 = apps[MockMozNetworkStats.APP_MANIFEST_1];
          var browserApp = apps[Common.BROWSER_APP.manifestURL];

          assert.equal(app1.total, 1047);
          assert.equal(browserApp.total, 595);
          assert.equal(result.data.mobile.total, app1.total + browserApp.total);

          assert.equal(
            fakeSettings.lastDataUsage.mobile.total,
            expectedLastDataUsage.mobile.total
          );

          done();
        });
      });
    }
  );

  test('Querying data usage globally caches the result', function(done) {
    this.sinon.stub(SimManager, 'requestDataSimIcc').yields({iccId: '12345'});

    CostControl.getInstance(function(service) {
      var lastDataUsagePerApp = {};
      service.lastDataUsagePerApp = lastDataUsagePerApp;
      service.request({type: 'datausage'}, function(result) {
        done(function() {
          assert.deepEqual(service.lastDataResults, result.data);
          assert.deepEqual(service.lastDataResultsPerApp, lastDataUsagePerApp);
        });
      });
    });
  });

  test(
    'Data cache per App is refreshed after a request per App',
    function(done) {
      this.sinon.stub(SimManager, 'requestDataSimIcc').yields({iccId: '12345'});

      CostControl.getInstance(function(service) {
        // Request per app
        var manifests = [MockMozNetworkStats.APP_MANIFEST_1,
                         MockMozNetworkStats.APP_MANIFEST_2];
        var lastDataUsage = {};
        service.lastDataUsage = lastDataUsage;
        service.request({type: 'datausage', apps: manifests}, function(result) {
          done(function() {
            assert.deepEqual(service.lastDataResultsPerApp, result.data);
            assert.deepEqual(service.lastDataResults, lastDataUsage);
          });
        });
      });
    }
  );
});
