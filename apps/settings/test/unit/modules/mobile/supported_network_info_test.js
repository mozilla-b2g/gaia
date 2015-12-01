/* global MockNavigatorMozMobileConnections */
'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');

suite('NetworkInfo', function() {
  var supportedNetworkInfo;
  var _mobileConnection;
  var mockNetworkType;
  var realMozMobileConnections;
  var modules = [
    'modules/mobile/supported_network_info'
  ];
  var map = {
    '*': {
      'modules/mobile/supported_network_type': 'MockNetworkType'
    }
  };
  var mockSupportedNetworkTypes = [
    'lte/wcdma/gsm',
    'lte/wcdma',
    'gsm',
    'wcdma',
    'wcdma/gsm-auto',
    'wcdma/gsm',
    'lte'
  ];

  setup(function(done) {
    var requireCtx = testRequire([], map, function() {});

    mockNetworkType = {
      SupportedNetworkTypeHelper: function(supportedNetworkTypes) {
        return mockSupportedNetworkTypes;
      }
    };
    define('MockNetworkType', function() {
      return mockNetworkType;
    });

    realMozMobileConnections = navigator.mozMobileConnections;
    navigator.mozMobileConnections = MockNavigatorMozMobileConnections;
    _mobileConnection = MockNavigatorMozMobileConnections[0];
    _mobileConnection.supportedNetworkTypes = mockSupportedNetworkTypes;

    requireCtx(modules, function(SupportedNetworkInfo) {
      supportedNetworkInfo = SupportedNetworkInfo;
      done();
    });
  });

  teardown(function() {
    _mobileConnection = null;
    navigator.mozMobileConnections = realMozMobileConnections;
  });

  suite('SupportedNetworkTypeHelper is called', function() {
    test('single hardware support type', function() {
      this.sinon.spy(mockNetworkType, 'SupportedNetworkTypeHelper');
      this.sinon.spy(supportedNetworkInfo, '_getMobileConnectionIndex');
      supportedNetworkInfo.getSupportedNetworkInfo(_mobileConnection);
      assert.ok(supportedNetworkInfo._getMobileConnectionIndex
        .calledWith(_mobileConnection));
      assert.ok(mockNetworkType.SupportedNetworkTypeHelper
        .calledWith(_mobileConnection.supportedNetworkTypes));
    });
  });
});
