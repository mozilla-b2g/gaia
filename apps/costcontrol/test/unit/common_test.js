'use strict';

requireApp('costcontrol/test/unit/mock_debug.js');
requireApp('costcontrol/js/common.js');
requireApp('costcontrol/test/unit/mock_moz_l10n.js');
requireApp('costcontrol/test/unit/mock_moz_network_stats.js');
requireApp('costcontrol/test/unit/mock_all_network_interfaces.js');
requireApp('costcontrol/test/unit/mock_config_manager.js');
requireApp('costcontrol/js/utils/toolkit.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');

var realMozL10n,
    realMozNetworkStats,
    realNetworkstatsProxy,
    realConfigManager,
    realMozSettings,
    realMozMobileConnections;

if (!this.navigator.mozL10n) {
  this.navigator.mozL10n = null;
}

if (!this.ConfigManager) {
  this.ConfigManager = null;
}

if (!this.navigator.mozNetworkStats) {
  this.navigator.mozNetworkStats = null;
}

if (!this.navigator.mozMobileConnections) {
  this.navigator.mozMobileConnections = null;
}

if (!this.navigator.mozSettings) {
  this.navigator.mozSettings = null;
}

if (!this.NetworkstatsProxy) {
  this.NetworkstatsProxy = null;
}

suite('Cost Control Common >', function() {

  suiteSetup(function() {

    realMozL10n = window.navigator.mozL10n;
    window.navigator.mozL10n = window.MockMozL10n;

    realMozNetworkStats = window.navigator.mozNetworkStats;
    navigator.mozNetworkStats = MockMozNetworkStats;

    realMozMobileConnections = navigator.mozMobileConnections;
    navigator.mozMobileConnections = MockNavigatorMozMobileConnections;

    realNetworkstatsProxy = window.NetworkstatsProxy;
    window.NetworkstatsProxy = MockMozNetworkStats;

    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    realConfigManager = window.ConfigManager;

    sinon.stub(Common, 'getIccInfo').returns = null;
  });

  suiteTeardown(function() {
    window.ConfigManager = realConfigManager;
    window.navigator.mozL10n = realMozL10n;
    window.navigator.mozNetworkStats = realMozNetworkStats;
    window.NetworkstatsProxy = realNetworkstatsProxy;
    window.navigator.mozSettings = realMozSettings;
    window.navigator.mozMobileConnections = realMozMobileConnections;
    Common.getIccInfo.restore();
  });

  function getCustomClearStats(willFail) {
    return function() {
      var request = {};
      setTimeout(function() {
        if (willFail) {
          request.error = { name: 'error' };
          request.onerror && request.onerror();
        } else {
          request.result = {};
          request.onsuccess && request.onsuccess();
        }
      }, 0);
      return request;
    };
  }

  function getSuccessfullClearStats() {
    return getCustomClearStats(false);
  }

  function getFailingClearStats() {
    return getCustomClearStats(true);
  }

  function createLockRequestFails() {
    return function() {
      return {
        set: null,
        get: function() {
          var request = {};
          setTimeout(function() {
            request.error = { name: 'error' };
            request.onerror && request.onerror();
          }, 0);
          return request;
        }
      };
    };
  };

  setup(function() {
    Common.dataSimIccIdLoaded = false;
    Common.dataSimIccId = null;
  });

  test('isValidICCID', function() {
    assert.isTrue(!Common.isValidICCID());
    assert.isTrue(!Common.isValidICCID(null));
    assert.isTrue(!Common.isValidICCID(undefined));
    assert.isTrue(!Common.isValidICCID(12345));
    assert.isFalse(!Common.isValidICCID('12334345'));
  });

  test('loadNetworkInterfaces correctly', function(done) {
    Common.loadNetworkInterfaces(
      function() {
        assert.isTrue(Common.allNetworkInterfaceLoaded);
        assert.equal(Common.allNetworkInterfaces.length,
                     MockAllNetworkInterfaces.length);
        assert.equal(Common.allNetworkInterfaces[0].type, WifiInterfaceType);
        assert.equal(Common.allNetworkInterfaces[1].type, MobileInterfaceType);
        assert.equal(Common.allNetworkInterfaces[1].id,
                      MockAllNetworkInterfaces[1].id);
        done();
      }
    );
  });

  test('loadIccDataSIM() works ok without settings', function(done) {
    MockNavigatorMozMobileConnections[0] = {
      iccId: MockAllNetworkInterfaces[1].id
    };
    Common.loadDataSIMIccId(
      function() {
        assert.isTrue(Common.dataSimIccIdLoaded);
        assert.equal(Common.dataSimIccId,
                     MockAllNetworkInterfaces[1].id);
        done();
      }
    );
  });

  test('loadIccDataSIM() fails noICC', function(done) {
    MockNavigatorSettings.mSettings['ril.data.defaultServiceId'] = 0;
    MockNavigatorMozMobileConnections[0] = {
      iccId: null
    };
    Common.loadDataSIMIccId(function() { },
      function _onError() {
        assert.isFalse(Common.dataSimIccIdLoaded);
        assert.isNull(Common.dataSimIccId);
        done();
      }
    );
  });

  test('loadIccDataSIM() works correctly', function(done) {
    MockNavigatorSettings.mSettings['ril.data.defaultServiceId'] = 0;
    MockNavigatorMozMobileConnections[0] = {
      iccId: Common.allNetworkInterfaces[1].id
    };
    Common.loadDataSIMIccId(
      function() {
        assert.isTrue(Common.dataSimIccIdLoaded);
        assert.equal(Common.dataSimIccId,
                     Common.allNetworkInterfaces[1].id);
        done();
      }
    );
  });

  test('loadIccDataSIM() works ok when settings request fails', function(done) {
    sinon.stub(navigator.mozSettings, 'createLock', createLockRequestFails());
    MockNavigatorMozMobileConnections[0] = {
      iccId: MockAllNetworkInterfaces[1].id
    };
    Common.loadDataSIMIccId(function _onSuccess() {
      assert.isTrue(Common.dataSimIccIdLoaded);
      assert.equal(Common.dataSimIccId,
                   MockAllNetworkInterfaces[1].id);
      navigator.mozSettings.createLock.restore();
      done();
    });
  });

  test('loadIccDataSIM() all fails', function(done) {
    sinon.stub(navigator.mozSettings, 'createLock', createLockRequestFails());
    MockNavigatorMozMobileConnections[0] = {
      iccId: null
    };

    Common.loadDataSIMIccId(function() { },
      function _onError() {
        assert.isFalse(Common.dataSimIccIdLoaded);
        navigator.mozSettings.createLock.restore();
        done();
      }
    );
  });

  suite('Reset Data>', function() {
    MockNavigatorSettings.mSettings['ril.data.defaultServiceId'] = 0;
    MockNavigatorMozMobileConnections[0] = {
      iccId: Common.allNetworkInterfaces[1].id
    };

    suiteSetup(function() {
      sinon.stub(MockMozNetworkStats, 'clearStats', getSuccessfullClearStats());
    });

    suiteTeardown(function() {
      MockMozNetworkStats.clearStats.restore();
    });


    setup(function() {
      window.ConfigManager = new MockConfigManager({});
      MockMozNetworkStats.clearStats.restore();

    });

    test('resetData() wifi interface', function(done) {

      sinon.stub(MockMozNetworkStats, 'clearStats', getSuccessfullClearStats());

      Common.loadNetworkInterfaces(function() {
        resetData('wifi', function() {
          assert.isTrue(MockMozNetworkStats.clearStats.calledOnce);
          assert.isTrue(MockMozNetworkStats.clearStats
                                   .calledWith(Common.allNetworkInterfaces[0]));
          done();
        });
      });
    });

    test('resetData() mobile interface', function(done) {

      sinon.stub(MockMozNetworkStats, 'clearStats', getSuccessfullClearStats());

      Common.loadNetworkInterfaces(function() {
        resetData('mobile', function() {
          assert.isTrue(MockMozNetworkStats.clearStats.calledOnce);
          assert.isTrue(MockMozNetworkStats.clearStats
                                   .calledWith(Common.allNetworkInterfaces[1]));
          done();
        });
      });
    });

    test('resetData() all interfaces', function(done) {

      sinon.stub(MockMozNetworkStats, 'clearStats', getSuccessfullClearStats());

      Common.loadNetworkInterfaces(function() {
        resetData('all', function() {
          assert.isTrue(MockMozNetworkStats.clearStats.calledTwice);
          done();
        });
      });
    });

    test('resetData() wifi interface fails', function(done) {

      sinon.stub(MockMozNetworkStats, 'clearStats', getFailingClearStats());

      window.ConfigManager = new MockConfigManager({});
      Common.loadNetworkInterfaces(function() {
        resetData('wifi', function() {}, function _onError() {
          assert.isTrue(MockMozNetworkStats.clearStats.calledOnce);
          done();
        });
      });
    });

    test('resetData() all interfaces fail', function(done) {

      sinon.stub(MockMozNetworkStats, 'clearStats', getFailingClearStats());

      var testOk = function() {
        if (MockMozNetworkStats.clearStats.calledTwice) {
          done();
        }
      };

      Common.loadNetworkInterfaces(function() {
        resetData('all', function() {
          setTimeout(testOk, 500);
        });
      });
    });
  });
});
