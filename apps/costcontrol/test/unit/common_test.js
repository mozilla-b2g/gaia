/* global MockAllNetworkInterfaces, Common, MockMozNetworkStats, ConfigManager,
          WifiInterfaceType, SimManager, MobileInterfaceType */

'use strict';

require('/test/unit/mock_debug.js');
require('/js/common.js');
require('/js/sim_manager.js');
require('/js/config/config_manager.js');
require('/test/unit/mock_moz_l10n.js');
require('/test/unit/mock_moz_network_stats.js');
require('/js/utils/toolkit.js');

var realMozL10n,
    realMozNetworkStats;

if (!window.navigator.mozL10n) {
  window.navigator.mozL10n = null;
}

if (!window.navigator.mozNetworkStats) {
  window.navigator.mozNetworkStats = null;
}

suite('Cost Control Common >', function() {

  suiteSetup(function() {
    realMozL10n = window.navigator.mozL10n;
    window.navigator.mozL10n = window.MockMozL10n;

    realMozNetworkStats = window.navigator.mozNetworkStats;
    navigator.mozNetworkStats = MockMozNetworkStats;
  });

  suiteTeardown(function() {
    window.navigator.mozL10n = realMozL10n;
    window.navigator.mozNetworkStats = realMozNetworkStats;
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

  suite('Reset Data>', function() {
    suiteSetup(function() {
      sinon.stub(SimManager, 'requestDataSimIcc', function(callback) {
        (typeof callback === 'function') &&
          callback({iccId: Common.allNetworkInterfaces[1].id});
      });
      sinon.stub(ConfigManager, 'setOption', function() {});
      sinon.stub(ConfigManager, 'requestSettings', function() {});
    });
    suiteTeardown(function() {
      SimManager.requestDataSimIcc.restore();
      ConfigManager.setOption.restore();
      ConfigManager.requestSettings.restore();
    });

    test('resetData() wifi interface', function(done) {
      sinon.stub(MockMozNetworkStats, 'clearStats', getSuccessfullClearStats());
      Common.loadNetworkInterfaces(function() {
        Common.resetData('wifi', function() {
          assert.isTrue(MockMozNetworkStats.clearStats.calledOnce);
          assert.isTrue(MockMozNetworkStats.clearStats
                                   .calledWith(Common.allNetworkInterfaces[0]));
          MockMozNetworkStats.clearStats.restore();
          done();
        });
      });
    });

    test('resetData() mobile interface', function(done) {

      sinon.stub(MockMozNetworkStats, 'clearStats', getSuccessfullClearStats());

      Common.loadNetworkInterfaces(function() {
        Common.resetData('mobile', function() {
          assert.isTrue(MockMozNetworkStats.clearStats.calledOnce);
          assert.isTrue(MockMozNetworkStats.clearStats
                                   .calledWith(Common.allNetworkInterfaces[1]));
          MockMozNetworkStats.clearStats.restore();
          done();
        });
      });
    });

    test('resetData() all interfaces', function(done) {

      sinon.stub(MockMozNetworkStats, 'clearStats', getSuccessfullClearStats());

      Common.loadNetworkInterfaces(function() {
        Common.resetData('all', function() {
          assert.isTrue(MockMozNetworkStats.clearStats.calledTwice);
          MockMozNetworkStats.clearStats.restore();
          done();
        });
      });
    });

    test('resetData() wifi interface fails', function(done) {

      sinon.stub(MockMozNetworkStats, 'clearStats', getFailingClearStats());

      Common.loadNetworkInterfaces(function() {
        Common.resetData('wifi', function() {}, function _onError() {
          assert.isTrue(MockMozNetworkStats.clearStats.calledOnce);
          MockMozNetworkStats.clearStats.restore();
          done();
        });
      });
    });

    test('resetData() all interfaces fail', function(done) {

      sinon.stub(MockMozNetworkStats, 'clearStats', getFailingClearStats());

      var testOk = function() {
        if (MockMozNetworkStats.clearStats.calledTwice) {
          MockMozNetworkStats.clearStats.restore();
          done();
        }
      };

      Common.loadNetworkInterfaces(function() {
        Common.resetData('all', function() {
          setTimeout(testOk, 500);
        });
      });
    });
  });
});
