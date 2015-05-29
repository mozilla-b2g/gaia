'use strict';

suite('NetworkTypeManager', function() {
  var NetworkTypeManager;
  var mockConn;
  var mockSupportedNetworkTypes = [
    'lte/wcdma/gsm',
    'lte/wcdma',
    'gsm',
    'wcdma',
    'wcdma/gsm-auto',
    'wcdma/gsm',
    'lte'
  ];
  var mockSettingshelper;
  var mockPreferredNetworkType = 'mockNetworkType';

  var realGetSupportedNetworkInfo;
  var realMozMobileConnections;

  var networkTypeManager;

  var modules = [
    'panels/operator_settings/models/network_type_manager'
  ];

  var map = {
    '*': {
      'shared/settings_helper': 'MockSettingsHelper'
    }
  };

  setup(function(done) {
    var requireCtx = testRequire([], map, function() {});

    mockSettingshelper = {
      get: function() {},
      set: function() {}
    };
    define('MockSettingsHelper', function() {
      return function() {
        return mockSettingshelper;
      };
    });

    mockConn = {
      getPreferredNetworkType:
        sinon.stub().returns(Promise.resolve(mockPreferredNetworkType)),
      setPreferredNetworkType: function() {}
    };
    realMozMobileConnections = navigator.mozMobileConnections;
    navigator.mozMobileConnections = [mockConn];

    realGetSupportedNetworkInfo = window.getSupportedNetworkInfo;
    window.getSupportedNetworkInfo = function(conn, callback) {
      callback({
        networkTypes: mockSupportedNetworkTypes
      });
    };

    requireCtx(modules, (_NetworkTypeManager) => {
      NetworkTypeManager = _NetworkTypeManager;
      networkTypeManager = NetworkTypeManager(mockConn);
      done();
    });
  });

  teardown(function() {
    window.getSupportedNetworkInfo = realGetSupportedNetworkInfo;
    navigator.mozMobileConnections = realMozMobileConnections;
  });

  suite('initial state', function() {
    suite('support setting preferred network type', function() {
      test('networkTypes', function(done) {
        var doAssert = function() {
          if (networkTypeManager.networkTypes.array.length !== 0) {
            assert.deepEqual(networkTypeManager.networkTypes.array,
              mockSupportedNetworkTypes);
            done();
          }
        };
        networkTypeManager.networkTypes.observe('length', doAssert);
        doAssert();
      });

      test('preferredNetworkType', function(done) {
        var doAssert = function() {
          if (networkTypeManager.preferredNetworkType !== null) {
            assert.equal(networkTypeManager.preferredNetworkType,
              mockPreferredNetworkType);
            done();
          }
        };
        networkTypeManager.observe('preferredNetworkType', doAssert);
        doAssert();
      });

      test('_serviceId', function() {
        assert.equal(networkTypeManager._serviceId,
          navigator.mozMobileConnections.indexOf(mockConn));
      });
    });

    suite('does not support setting preferred network type', function() {
      test('should throw an exception', function() {
        assert.throw(() => {
          NetworkTypeManager({});
        }, Error);
      });
    });
  });

  suite('getSupportedNetworkInfo', function() {
    suite('_supportedNetworkInfo is null', function() {
      var mockResult;

      setup(function() {
        mockResult = {};
        sinon.stub(window, 'getSupportedNetworkInfo');
        networkTypeManager._supportedNetworkInfo = null;
      });

      test('should return the result from window.getSupportedNetworkInfo',
        function(done) {
          assert.becomes(networkTypeManager.getSupportedNetworkInfo(),
            mockResult).notify(done);
          window.getSupportedNetworkInfo.args[0][1](mockResult);
      });

      test('should save the result in _supportedNetworkInfo', function() {
        networkTypeManager.getSupportedNetworkInfo();
        window.getSupportedNetworkInfo.args[0][1](mockResult);
        assert.equal(mockResult, networkTypeManager._supportedNetworkInfo);
      });
    });

    suite('_supportedNetworkInfo is not null', function() {
      test('shodul return the value of _supportedNetworkInfo', function(done) {
        var mockResult = {};
        networkTypeManager._supportedNetworkInfo = mockResult;
        assert.becomes(networkTypeManager.getSupportedNetworkInfo(),
          mockResult).notify(done);
      });
    });
  });

  suite('setPreferredNetworkType', function() {
    var mockNetworkType = 'mockNetworkType';

    setup(function() {
      sinon.stub(mockConn, 'setPreferredNetworkType', function() {
        return Promise.resolve();
      });
      networkTypeManager = NetworkTypeManager(mockConn);
    });

    test('preferredNetworkType should change to the setting value',
      function(done) {
        networkTypeManager.observe('preferredNetworkType', function(value) {
          if (value === mockNetworkType) {
            done();
          }
        });
        networkTypeManager.setPreferredNetworkType(mockNetworkType);
    });

    test('the setting value should be stored using SettingsHelper',
      function(done) {
        var settingsHeplerGetCallback;
        sinon.stub(mockSettingshelper, 'get', function(callback) {
          settingsHeplerGetCallback = callback;
        });
        sinon.spy(mockSettingshelper, 'set');
        networkTypeManager.setPreferredNetworkType(mockNetworkType).then(() => {
          settingsHeplerGetCallback({});
          assert.deepEqual(mockSettingshelper.set.args[0][0], {
            '0': mockNetworkType
          });
        }).then(done, done);
    });
  });
});
