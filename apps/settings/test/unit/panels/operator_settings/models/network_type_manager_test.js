/* global MockNavigatorMozMobileConnections */
'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');

suite('NetworkTypeManager', function() {
  var NetworkTypeManager;
  var networkTypeManager;
  var _mobileConnection;
  var realMozMobileConnections;
  var mockNetworkInfo;
  var mockSupportedNetworkTypes = [
    'wcdma/gsm',
    'gsm',
    'wcdma',
    'wcdma/gsm-auto',
    'cdma/evdo',
    'cdma',
    'evdo',
    'wcdma/gsm/cdma/evdo',
    'lte/cdma/evdo',
    'lte/wcdma/gsm',
    'lte/wcdma/gsm/cdma/evdo',
    'lte',
    'lte/wcdma'
  ];
  var mockSettingshelper;

  var modules = [
    'panels/operator_settings/models/network_type_manager'
  ];

  var map = {
    '*': {
      'shared/settings_helper': 'MockSettingsHelper',
      'modules/mobile/suppoted_network_info': 'MockNetworkInfo'
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

    mockNetworkInfo = {
      getSupportedNetworkInfo: function(conn, callback) {}
    };
    define('MockNetworkInfo', function() {
      return mockNetworkInfo;
    });

    realMozMobileConnections = navigator.mozMobileConnections;
    navigator.mozMobileConnections = MockNavigatorMozMobileConnections;
    _mobileConnection = MockNavigatorMozMobileConnections[0];
    _mobileConnection.supportedNetworkTypes = mockSupportedNetworkTypes;

    requireCtx(modules, (_NetworkTypeManager) => {
      NetworkTypeManager = _NetworkTypeManager;
      networkTypeManager = NetworkTypeManager(_mobileConnection);
      done();
    });
  });

  teardown(function() {
    _mobileConnection = null;
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
        networkTypeManager._preferredNetworkType = 'mockNetworkType';
        var doAssert = function() {
          if (networkTypeManager.preferredNetworkType !== null) {
            assert.equal(networkTypeManager.preferredNetworkType,
              'mockNetworkType');
            done();
          }
        };
        networkTypeManager.observe('preferredNetworkType', doAssert);
        doAssert();
      });

      test('_serviceId', function() {
        assert.equal(networkTypeManager._serviceId, 0);
      });
    });

    suite('does not support setting preferred network type', function() {
      test('should throw an exception', function() {
        assert.throw(() => {
          networkTypeManager({});
        }, Error);
      });
    });
  });

  suite('getSupportedNetworkInfo', function() {
    suite('_supportedNetworkInfo is not null', function() {
      test('should return the value of _supportedNetworkInfo', function(done) {
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
      sinon.stub(_mobileConnection, 'setPreferredNetworkType', function() {
        return Promise.resolve();
      });
      networkTypeManager = NetworkTypeManager(_mobileConnection);
    });

    teardown(function() {
      _mobileConnection.setPreferredNetworkType.restore();
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
