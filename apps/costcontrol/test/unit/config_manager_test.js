/* global SimManager, LazyLoader, asyncStorage, ConfigManager, MocksHelper*/
'use strict';

require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_async_storage.js');
require('/test/unit/mock_debug.js');
require('/js/utils/toolkit.js');
require('/js/sim_manager.js');
require('/js/config/config_manager.js');


var MocksHelperForUnitTest = new MocksHelper([
  'asyncStorage',
  'LazyLoader'
]).init();

suite('Config Manager Test Suite >', function() {

  MocksHelperForUnitTest.attachTestHelpers();
  var defaultConfig = { provider: 'default'};
  var vivoConfig = { provider: 'vivo' };

  function simulateSIMChange() {
    ConfigManager.setConfig(null);
  }

  setup(function() {
    this.sinon.stub(LazyLoader, 'getJSON')
      .withArgs('/js/config/index.json')
      .returns(Promise.resolve({'724_6': 'vivo', '123_4': 'testing'}));

    this.sinon.stub(LazyLoader, 'load', function(fileName, callback) {
      if (fileName === 'js/config/default/config.js') {
        ConfigManager.setConfig(defaultConfig);
      } else {
        ConfigManager.setConfig(vivoConfig);
      }
      (typeof callback === 'function') && callback();
    });
    this.sinon.stub(asyncStorage, 'getItem').yields({});
    simulateSIMChange();
  });

  test('After switching the simcard with the same carrier, a configuration is' +
       ' loaded',
    function(done) {
      var iccForTesting = {
        iccId: 1234,
        iccInfo: {
          mcc:'724',
          mnc:'6'
        }
      };
      this.sinon.stub(SimManager, 'requestDataSimIcc')
        .yields({ icc: iccForTesting });

      ConfigManager.requestAll(function(configuration, settings) {
        assert.deepEqual(configuration, vivoConfig);

        simulateSIMChange();

        // Loading the config for the "new Sim detected" (same carrier)
        ConfigManager.requestAll(function(configuration, settings) {
          // Checking if a configuration is loaded
          assert.isNotNull(configuration);
          done();
        });
      });
  });

  test('Switching the simcard with the same carrier, a valid configuration ' +
       'is loaded (testing cache behaviour)',
    function(done) {
      var iccForTesting = {
        iccId: 1234,
        iccInfo: {
          mcc:'123',
          mnc:'4'
        }
      };
      this.sinon.stub(SimManager, 'requestDataSimIcc')
        .yields({ icc: iccForTesting });

      ConfigManager.requestAll(function(configuration, settings) {
        assert.deepEqual(configuration, vivoConfig);
        assert.isTrue(LazyLoader.load.calledOnce);

        simulateSIMChange();
        // Force the config reload (second time)
        ConfigManager.requestAll(function(configuration, settings) {
          assert.isTrue(LazyLoader.load.calledOnce);
          assert.deepEqual(configuration, vivoConfig);
          done();
        });
      });
  });

  test(' Loading an non-existent configuration defaults in default config',
    function(done) {
      var iccForTesting = {
        iccId: 1234,
        iccInfo: {
          mcc:'214',
          mnc:'07'
        }
      };
      this.sinon.stub(SimManager, 'requestDataSimIcc')
        .yields({ icc: iccForTesting });

      ConfigManager.requestAll(function(configuration, settings) {
        assert.deepEqual(configuration, defaultConfig);
        done();
      });
  });

  test(' Load a valid configuration', function(done) {
    var iccForTesting = {
      iccId: 1234,
      iccInfo: {
        mcc:'724',
        mnc:'6'
      }
    };
    this.sinon.stub(SimManager, 'requestDataSimIcc')
      .yields({ icc: iccForTesting });

    ConfigManager.requestAll(function(configuration, settings) {
      assert.deepEqual(configuration, vivoConfig);
      done();
    });
  });


});
