/* This should live in the shared directory */

'use strict';

requireApp('system/shared/js/mobile_operator.js');

suite('shared/MobileOperator', function() {
  var MockMobileConnection1;
  var BRAZIL_MCC = 724;


  setup(function() {
    MockMobileConnection1 = {
      voice: {
        network: {
          shortName: 'Fake short',
          longName: 'Fake long',
          mnc: '6'
        },
        cell: { gsmLocationAreaCode: 71 }
      },
      iccInfo: { spn: 'Fake SPN' }
    };
    
    MockMobileConnection2 = {
      voice: {
        network: {
          shortName: 'Nextel',
          longName: 'NII Holdings, Inc.',
          mcc: '724
          mnc: '00'
        },
        cell: { gsmLocationAreaCode: 55 }
      },
      iccInfo: { spn: 'Fake SPN' }
    };
  });

  suite('Worldwide connection', function() {
    test('Connection with short name', function() {
      var infos = MobileOperator.userFacingInfo(MockMobileConnection1);
      assert.equal(infos.operator, 'Fake short');
      assert.isUndefined(infos.carrier);
      assert.isUndefined(infos.region);
    });
    test('Connection with long name', function() {
      MockMobileConnection1.voice.network.shortName = '';
      var infos = MobileOperator.userFacingInfo(MockMobileConnection1);
      assert.equal(infos.operator, 'Fake long');
      assert.isUndefined(infos.carrier);
      assert.isUndefined(infos.region);
    });
    test('Connection with SPN display', function() {
      MockMobileConnection1.iccInfo.isDisplaySpnRequired = true;
      var infos = MobileOperator.userFacingInfo(MockMobileConnection1);
      assert.equal(infos.operator, 'Fake SPN');
      assert.isUndefined(infos.carrier);
      assert.isUndefined(infos.region);
    });
    test('Connection with SPN display and network display', function() {
      MockMobileConnection1.iccInfo.isDisplaySpnRequired = true;
      MockMobileConnection1.iccInfo.isDisplayNetworkNameRequired = true;
      var infos = MobileOperator.userFacingInfo(MockMobileConnection1);
      assert.equal(infos.operator, 'Fake short Fake SPN');
      assert.isUndefined(infos.carrier);
      assert.isUndefined(infos.region);
    });
    test('Connection with same SPN and network name', function() {
      MockMobileConnection1.iccInfo.isDisplaySpnRequired = true;
      MockMobileConnection1.iccInfo.spn = 'Fake short';
      MockMobileConnection1.iccInfo.isDisplayNetworkNameRequired = true;
      var infos = MobileOperator.userFacingInfo(MockMobileConnection1);
      assert.equal(infos.operator, 'Fake short');
      assert.isUndefined(infos.carrier);
      assert.isUndefined(infos.region);
    });
    test('Connection with roaming', function() {
      MockMobileConnection1.voice.roaming = true;
      var infos = MobileOperator.userFacingInfo(MockMobileConnection1);
      assert.equal(infos.operator, 'Fake short');
      assert.isUndefined(infos.carrier);
      assert.isUndefined(infos.region);
    });
    test('Connection with roaming and SPN display', function() {
      MockMobileConnection1.voice.roaming = true;
      MockMobileConnection1.iccInfo.isDisplaySpnRequired = true;
      var infos = MobileOperator.userFacingInfo(MockMobileConnection1);
      assert.equal(infos.operator, 'Fake short');
      assert.isUndefined(infos.carrier);
      assert.isUndefined(infos.region);
    });
  });
  suite('Brazilian connection', function() {
    test('Connection ', function() {
      MockMobileConnection1.voice.network.mcc = BRAZIL_MCC;
      var infos = MobileOperator.userFacingInfo(MockMobileConnection1);
      assert.equal(infos.operator, 'Fake short');
      assert.equal(infos.carrier, 'VIVO');
      assert.equal(infos.region, 'BA 71');
    });
    test('Connection with unknown mnc', function() {
      MockMobileConnection1.voice.network.mcc = BRAZIL_MCC;
      MockMobileConnection1.voice.network.mnc = '42';
      var infos = MobileOperator.userFacingInfo(MockMobileConnection1);
      assert.equal(infos.operator, 'Fake short');
      assert.equal(infos.carrier, '72442');
      assert.equal(infos.region, 'BA 71');
    });
    test('Connection with unknown gsmLocationAreaCode', function() {
      MockMobileConnection1.voice.network.mcc = BRAZIL_MCC;
      MockMobileConnection1.voice.cell.gsmLocationAreaCode = 2;
      var infos = MobileOperator.userFacingInfo(MockMobileConnection1);
      assert.equal(infos.operator, 'Fake short');
      assert.equal(infos.carrier, 'VIVO');
      assert.equal(infos.region, '');
    });
  });
  suite('Test String for mnc', function(){
    test('Connection ', function() {
      var infos = MobileOperator.userFacingInfo(MockMobileConnection2);
      assert.equal(infos.operator, 'Nextel');
      assert.equal(infos.carrier, '72400');
      assert.equal(infos.region, 'BA 55');
  });
});

