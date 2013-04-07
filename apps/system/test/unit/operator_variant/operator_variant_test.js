'use strict';

requireApp('system/test/unit/mock_navigator_moz_mobile_connection.js');
requireApp('system/test/unit/mock_navigator_settings.js');
requireApp('system/test/unit/mocks_helper.js');

requireApp('system/js/operator_variant/operator_variant.js');

var mocksForOperatorVariant = [
  'NavigatorMozMobileConnection',
  'NavigatorSettings'
];

mocksForOperatorVariant.forEach(function(mockName) {
  if (!window[mockName]) {
    window[mockName] = null;
  }
});

suite('system/OperatorVariant', function() {
  var mocksHelper;

  var realMozMobileConnection, realNavigatorSettings;

  suiteSetup(function() {
    mocksHelper = new MocksHelper(mocksForOperatorVariant);
    mocksHelper.suiteSetup();

    realMozMobileConnection = navigator.mozMobileConnection;
    navigator.mozMobileConnection = MockNavigatorMozMobileConnection;
    realNavigatorSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

  });

  suiteTeardown(function() {
    mocksHelper.suiteTeardown();

    navigator.mozMobileConnection = realMozMobileConnection;
    navigator.mozSettings = realNavigatorSettings;
  });

  setup(function() {
    mocksHelper.setup();
  });

  teardown(function() {
    mocksHelper.teardown();

    MockNavigatorMozMobileConnection.mTeardown();
    MockNavigatorSettings.mTeardown();
  });

  suite('Read mcc/mnc settings', function() {

    test('Default values', function() {
      assert.equal(OperatorVariantManager.iccSettings.mcc, -1);
      assert.equal(OperatorVariantManager.iccSettings.mnc, -1);
    });

    test('Run getICCSettings function', function() {
      MockNavigatorSettings.createLock().set({'operatorvariant.mcc': '214'});
      MockNavigatorSettings.createLock().set({'operatorvariant.mnc': '07'});

      OperatorVariantManager.getICCSettings(function() {
        assert.equal(OperatorVariantManager.iccSettings.mcc, 214);
        assert.equal(OperatorVariantManager.iccSettings.mnc, 7);
      });
    });
  });

  suite('Get APN database', function() {
    test('Get Movistar APN data', function() {
      OperatorVariantManager.iccSettings.mcc = 214;
      OperatorVariantManager.iccSettings.mnc = 7;

      OperatorVariantManager.retrieveOperatorVariantSettings(function(apns) {
        var apn;
        for (var i = 0; i < apns.length; i++) {
          if (apns[i] && apns[i].type.indexOf('default') != -1) {
            apn = apns[i];
            break;
          }
        }
        assert.equal(apn.carrier, 'Movistar');
        assert.equal(apn.apn, 'telefonica.es');
      });
    });
  });

  suite('Load settings', function() {
    test('Load Movistar APN settings', function() {
      var apns = [
        {"carrier":"Movistar MMS","apn":"telefonica.es","user":"telefonica",
         "password":"telefonica","mmsc":"http://mms.movistar.com",
         "mmsproxy":"10.138.255.5","mmsport":"8080","type":["mms"]},
        {"voicemail":"123","enableStrict7BitEncodingForSms":true,
         "type":["operatorvariant"]},
        {"carrier":"Movistar","apn":"telefonica.es","user":"telefonica",
         "password":"telefonica","proxy":"10.138.255.133","port":"8080",
         "type":["default","supl"]}
      ];

      OperatorVariantManager.applyOperatorVariantSettings(apns);
      var request = MockNavigatorSettings.createLock().get('ril.data.carrier');
      request.onsuccess = function() {
        assert.equal(request.result['ril.data.carrier'], 'Movistar');
      };
    });
  });
});
