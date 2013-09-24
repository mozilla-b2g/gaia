/* This should live in the shared directory */

'use strict';

requireApp('system/shared/js/mobile_operator.js');

suite('shared/MobileOperator', function() {
  var MockMobileConnection, MockIccHelper;
  var BRAZIL_MCC = '724';


  setup(function() {
    MockMobileConnection = {
      voice: {
        network: {
          shortName: 'Fake short',
          longName: 'Fake long',
          mnc: '06'
        },
        cell: { gsmLocationAreaCode: 71 }
      }
    };

    MockIccHelper = {
      iccInfo: { spn: 'Fake SPN' }
    };

    window.IccHelper = MockIccHelper;
  });

  suite('Worldwide connection', function() {
    test('Connection with short name', function() {
      var infos = MobileOperator.userFacingInfo(MockMobileConnection);
      assert.equal(infos.operator, 'Fake short');
      assert.isUndefined(infos.carrier);
      assert.isUndefined(infos.region);
    });
    test('Connection with long name', function() {
      MockMobileConnection.voice.network.shortName = '';
      var infos = MobileOperator.userFacingInfo(MockMobileConnection);
      assert.equal(infos.operator, 'Fake long');
      assert.isUndefined(infos.carrier);
      assert.isUndefined(infos.region);
    });
    test('Connection with SPN display', function() {
      MockIccHelper.iccInfo.isDisplaySpnRequired = true;
      var infos = MobileOperator.userFacingInfo(MockMobileConnection);
      assert.equal(infos.operator, 'Fake SPN');
      assert.isUndefined(infos.carrier);
      assert.isUndefined(infos.region);
    });
    test('Connection with SPN display and network display', function() {
      MockIccHelper.iccInfo.isDisplaySpnRequired = true;
      MockIccHelper.iccInfo.isDisplayNetworkNameRequired = true;
      var infos = MobileOperator.userFacingInfo(MockMobileConnection);
      assert.equal(infos.operator, 'Fake short Fake SPN');
      assert.isUndefined(infos.carrier);
      assert.isUndefined(infos.region);
    });
    test('Connection with same SPN and network name', function() {
      MockIccHelper.iccInfo.isDisplaySpnRequired = true;
      MockIccHelper.iccInfo.spn = 'Fake short';
      MockIccHelper.iccInfo.isDisplayNetworkNameRequired = true;
      var infos = MobileOperator.userFacingInfo(MockMobileConnection);
      assert.equal(infos.operator, 'Fake short');
      assert.isUndefined(infos.carrier);
      assert.isUndefined(infos.region);
    });
    test('Connection with roaming', function() {
      MockMobileConnection.voice.roaming = true;
      var infos = MobileOperator.userFacingInfo(MockMobileConnection);
      assert.equal(infos.operator, 'Fake short');
      assert.isUndefined(infos.carrier);
      assert.isUndefined(infos.region);
    });
    test('Connection with roaming and SPN display', function() {
      MockMobileConnection.voice.roaming = true;
      MockIccHelper.iccInfo.isDisplaySpnRequired = true;
      var infos = MobileOperator.userFacingInfo(MockMobileConnection);
      assert.equal(infos.operator, 'Fake short');
      assert.isUndefined(infos.carrier);
      assert.isUndefined(infos.region);
    });
  });
  suite('Brazilian connection', function() {
    test('Connection ', function() {
      MockMobileConnection.voice.network.mcc = BRAZIL_MCC;
      var infos = MobileOperator.userFacingInfo(MockMobileConnection);
      assert.equal(infos.operator, 'Fake short');
      assert.equal(infos.carrier, 'VIVO');
      assert.equal(infos.region, 'BA 71');
    });
    test('Connection with unknown mnc', function() {
      MockMobileConnection.voice.network.mcc = BRAZIL_MCC;
      MockMobileConnection.voice.network.mnc = '42';
      var infos = MobileOperator.userFacingInfo(MockMobileConnection);
      assert.equal(infos.operator, 'Fake short');
      assert.equal(infos.carrier, '72442');
      assert.equal(infos.region, 'BA 71');
    });
    test('Connection with unknown gsmLocationAreaCode', function() {
      MockMobileConnection.voice.network.mcc = BRAZIL_MCC;
      MockMobileConnection.voice.cell.gsmLocationAreaCode = 2;
      var infos = MobileOperator.userFacingInfo(MockMobileConnection);
      assert.equal(infos.operator, 'Fake short');
      assert.equal(infos.carrier, 'VIVO');
      assert.equal(infos.region, '');
    });
    test('Check the carrier and region with roaming connection', function() {
      MockMobileConnection.voice.network.mcc = BRAZIL_MCC;
      MockMobileConnection.voice.network.mnc = '02';
      MockMobileConnection.voice.roaming = true;
      var infos = MobileOperator.userFacingInfo(MockMobileConnection);
      assert.equal(infos.operator, 'Fake short');
      assert.equal(infos.carrier, 'TIM');
      assert.equal(infos.region, 'BA 71');
    });
  });
});
