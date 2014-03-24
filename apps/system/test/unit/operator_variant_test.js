/* globals MockNavigatorMozIccManager, MockNavigatorMozMobileConnections,
           MockNavigatorSettings, MockNavigatorMozIccManager,
           OperatorVariantHandler */

'use strict';

requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_icc_manager.js');
require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');

require('/shared/js/operator_variant_helper.js');
require('/shared/js/apn_helper.js');
requireApp('system/js/operator_variant/operator_variant.js');

suite('Operator variant', function() {
  const FAKE_ICC_ID = '8934071100276980483';
  const FAKE_ICC_CARD_INDEX = '0';
  const TEST_NETWORK_MCC = '001';

  const ORIGINAL_VOICEMAIL_NUMBER = '9999';
  const FAKE_VOICEMAIL_NUMBER = '1234';

  const EXPECTED_MNC = '01';
  const EXPECTED_ICC_INFO = {
    mcc: TEST_NETWORK_MCC,
    mnc: EXPECTED_MNC
  };

  const T_MOBILE_US_MCC = '310';
  const T_MOBILE_160_US_MNC = '160';
  const T_MOBILE_200_US_MNC = '200';

  const T_MOBILE_160_US_ICC_INFO = {
    mcc: T_MOBILE_US_MCC,
    mnc: T_MOBILE_160_US_MNC
  };

  const T_MOBILE_200_US_ICC_INFO = {
    mcc: T_MOBILE_US_MCC,
    mnc: T_MOBILE_200_US_MNC
  };

  const NULL_ICC_INFO = { mcc: '000', mnc: '00' };

  const KEYS_VALUES = [
    { key: 'ril.data.carrier', value: 'Test Network' },
    { key: 'ril.data.apn', value: 'internet' },
    { key: 'ril.data.user', value: 'user' },
    { key: 'ril.data.passwd', value: 'password' },
    { key: 'ril.data.httpProxyHost', value: '127.0.0.1' },
    { key: 'ril.data.httpProxyPort', value: '8080' },
    { key: 'ril.data.authtype', value: 'none' },
    { key: 'ril.supl.carrier', value: 'Test Network' },
    { key: 'ril.supl.apn', value: 'internet' },
    { key: 'ril.supl.user', value: 'user' },
    { key: 'ril.supl.passwd', value: 'password' },
    { key: 'ril.supl.httpProxyHost', value: '127.0.0.1' },
    { key: 'ril.supl.httpProxyPort', value: '8080' },
    { key: 'ril.supl.authtype', value: 'none' },
    { key: 'ril.dun.carrier', value: 'Test Network' },
    { key: 'ril.dun.apn', value: 'internet' },
    { key: 'ril.dun.user', value: 'user' },
    { key: 'ril.dun.passwd', value: 'password' },
    { key: 'ril.dun.httpProxyHost', value: '127.0.0.1' },
    { key: 'ril.dun.httpProxyPort', value: '8080' },
    { key: 'ril.dun.authtype', value: 'none' },
    { key: 'ril.ims.carrier', value: 'Test Network' },
    { key: 'ril.ims.apn', value: 'internet' },
    { key: 'ril.ims.user', value: 'user' },
    { key: 'ril.ims.passwd', value: 'password' },
    { key: 'ril.ims.httpProxyHost', value: '127.0.0.1' },
    { key: 'ril.ims.httpProxyPort', value: '8080' },
    { key: 'ril.ims.authtype', value: 'none' },
    { key: 'ril.mms.carrier', value: 'Test Network' },
    { key: 'ril.mms.apn', value: 'internet' },
    { key: 'ril.mms.mmsc', value: 'http://127.0.0.1' },
    { key: 'ril.mms.mmsproxy', value: '127.0.0.1' },
    { key: 'ril.mms.mmsport', value: '8080' },
    { key: 'ril.data.carrier', value: 'Test Network' },
    { key: 'ril.iccInfo.mbdn', value: [ORIGINAL_VOICEMAIL_NUMBER, ''] },
    { key: 'ril.cellbroadcast.searchlist', value: '0,1,2,3' }
  ];

  var realMozSettings, realMozIccManager, realMozMobileConnections;

  var mozIcc;

  suiteSetup(function() {
    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    realMozIccManager = navigator.mozIccManager;
    navigator.mozIccManager = MockNavigatorMozIccManager;

    realMozMobileConnections = navigator.mozMobileConnections;
    navigator.mozMobileConnections = MockNavigatorMozMobileConnections;
  });

  suiteTeardown(function() {
    navigator.mozSettings = realMozSettings;
    navigator.mozIccManager = realMozIccManager;
    navigator.mozMobileConnections = realMozMobileConnections;
  });

  setup(function() {
    mozIcc = {
      'cardState': 'ready',
      matchMvno: function mi_matchMvno(mvnoType, matchData) {
        var req = {
          onsuccess: null,
          onerror: null,
          result: false
        };

        setTimeout(function() {
          if (req.onsuccess) {
            req.onsuccess();
          }
        });

        return req;
      }
    };
    MockNavigatorMozIccManager.addIcc(FAKE_ICC_ID, mozIcc);
    MockNavigatorMozIccManager.getIccById(FAKE_ICC_ID).iccInfo =
      NULL_ICC_INFO;

    MockNavigatorMozMobileConnections[0].data = {
      type: 'gsm'
    };
  });

  teardown(function() {
    MockNavigatorMozIccManager.mTeardown();
    MockNavigatorMozMobileConnections.mTeardown();
  });

  function setObservers(keyValues, observer, remove) {
    if (remove === undefined) {
      remove = false;
    }

    if (remove) {
      keyValues.forEach(function(data) {
        MockNavigatorSettings.removeObserver(data.key, this);
      }, observer.bound);
      observer.bound = null;
    }
    else {
      observer.bound = observer.func.bind(observer);
      keyValues.forEach(function(data) {
        MockNavigatorSettings.addObserver(data.key, this);
      }, observer.bound);
    }
  }

  test('Apply operator variant settings', function(done) {
    var observer = {
      bound: null,
      expected: KEYS_VALUES.length,
      seen: 0,
      func: function(event) {
        KEYS_VALUES.forEach(function(data) {
          if (data.key == event.settingName) {
            assert.equal(
              event.settingValue,
              data.value,
              'Wrong Data setting value'
            );
            ++this.seen;
          }
        }, this);

        if (this.seen == this.expected) {
          setObservers(KEYS_VALUES, this, true);
          done();
        }
      }
    };

    setObservers(KEYS_VALUES, observer);

    MockNavigatorMozIccManager.getIccById(FAKE_ICC_ID).iccInfo =
      EXPECTED_ICC_INFO;
    OperatorVariantHandler.handleICCCard(FAKE_ICC_ID, FAKE_ICC_CARD_INDEX);
  });

  test('operator variant apply once per boot', function() {
    var observer = {
      bound: null,
      hasApplied: false,
      func: function(event) {
        if (event.settingName == 'ril.data.carrier') {
          assert.false(
            this.hasApplied,
            'Settings should *not* be applied twice!'
          );

          assert.match(
            event.settingValue,
            /^T-Mobile US/,
            'Expected network name to contain "T-Mobile US"'
          );

          this.hasApplied = true;
        }
      }
    };

    observer.bound = observer.func.bind(observer);
    MockNavigatorSettings.addObserver('ril.data.carrier', observer.bound);

    // Testing apply once per boot requires *real* mcc/mnc information.
    MockNavigatorMozIccManager.getIccById(FAKE_ICC_ID).iccInfo =
      T_MOBILE_160_US_ICC_INFO;
    OperatorVariantHandler.handleICCCard(FAKE_ICC_ID, FAKE_ICC_CARD_INDEX);
    MockNavigatorMozIccManager.getIccById(FAKE_ICC_ID).triggerEventListeners(
      'iccinfochange', {}
    );

    MockNavigatorMozIccManager.getIccById(FAKE_ICC_ID).iccInfo =
      T_MOBILE_200_US_ICC_INFO;
    MockNavigatorMozIccManager.getIccById(FAKE_ICC_ID).triggerEventListeners(
      'iccinfochange', {}
    );
  });

  test('APN filtering', function(done) {
    var ovh = new OperatorVariantHandler(FAKE_ICC_ID, FAKE_ICC_CARD_INDEX);

    /* Inject some dummy MCC & MNC values corresponding to the test APNs, look
     * into shared/resources/apn.json for the corresponding values */
    ovh._iccSettings = { mcc: '001', mnc: '02' };

    MockNavigatorMozMobileConnections[0].data.type = 'gsm';
    ovh.retrieveOperatorVariantSettings(function(list) {
      assert.equal(list.length, 2);
      assert.isTrue(list.some(function(element) {
        return (element.carrier === 'NoBearer');
      }));
      assert.isTrue(list.some(function(element) {
        return (element.carrier === 'ZeroBearer');
      }));

      MockNavigatorMozMobileConnections[0].data.type = 'evdo0';
        ovh.retrieveOperatorVariantSettings(function(list) {
        assert.equal(list.length, 3);
        assert.isTrue(list.some(function(element) {
          return (element.carrier === 'NoBearer');
        }));
        assert.isTrue(list.some(function(element) {
          return (element.carrier === 'ZeroBearer');
        }));
        assert.isTrue(list.some(function(element) {
          return (element.carrier === 'Evdo0Bearer');
        }));

        done();
      });
    });
  });

  suite('updateVoicemailSettings', function() {
    suiteSetup(function() {
      this.clock = sinon.useFakeTimers();
    });

    suiteTeardown(function() {
      this.clock.restore();
    });

    setup(function() {
      this.ovh = new OperatorVariantHandler(FAKE_ICC_ID, FAKE_ICC_CARD_INDEX);
    });

    teardown(function() {
      MockNavigatorSettings.mTeardown();
    });

    suite('without value in "ril.iccInfo.mbdn"', function() {
      setup(function() {
        MockNavigatorSettings.mSet({ 'ril.iccInfo.mbdn': null });
      });

      test('system update is true', function() {
        this.ovh.updateVoicemailSettings(
          FAKE_VOICEMAIL_NUMBER, true);
        this.clock.tick(1000);
        assert.deepEqual(MockNavigatorSettings.mSettings['ril.iccInfo.mbdn'],
          [null, '']);
      });

      test('system update is false', function() {
        this.ovh.updateVoicemailSettings(
          FAKE_VOICEMAIL_NUMBER, false);
        this.clock.tick(1000);
        assert.deepEqual(MockNavigatorSettings.mSettings['ril.iccInfo.mbdn'],
          [FAKE_VOICEMAIL_NUMBER, '']);
      });
    });

    suite('with string type value in "ril.iccInfo.mbdn"', function() {
      test('system update is true', function() {
        MockNavigatorSettings.mSet({
          'ril.iccInfo.mbdn': ORIGINAL_VOICEMAIL_NUMBER
        });
        this.ovh.updateVoicemailSettings(FAKE_VOICEMAIL_NUMBER, true);
        this.clock.tick(1000);
        assert.deepEqual(
          MockNavigatorSettings.mSettings['ril.iccInfo.mbdn'],
          [ORIGINAL_VOICEMAIL_NUMBER, '']
        );
      });

      test('system update is false', function() {
        MockNavigatorSettings.mSet({
          'ril.iccInfo.mbdn': ORIGINAL_VOICEMAIL_NUMBER
        });
        this.ovh.updateVoicemailSettings(FAKE_VOICEMAIL_NUMBER, false);
        this.clock.tick(1000);
        assert.deepEqual(
          MockNavigatorSettings.mSettings['ril.iccInfo.mbdn'],
          [FAKE_VOICEMAIL_NUMBER, '']
        );
      });
    });

    suite('with array type value in "ril.iccInfo.mbdn"', function() {
      test('system update is true', function() {
        MockNavigatorSettings.mSet({
          'ril.iccInfo.mbdn': [ORIGINAL_VOICEMAIL_NUMBER, '']
        });
        this.ovh.updateVoicemailSettings(FAKE_VOICEMAIL_NUMBER, true);
        this.clock.tick(1000);
        assert.deepEqual(
          MockNavigatorSettings.mSettings['ril.iccInfo.mbdn'],
          [ORIGINAL_VOICEMAIL_NUMBER, '']
        );
      });

      test('system update is false', function() {
        MockNavigatorSettings.mSet({
          'ril.iccInfo.mbdn': [ORIGINAL_VOICEMAIL_NUMBER, '']
        });
        this.ovh.updateVoicemailSettings(FAKE_VOICEMAIL_NUMBER, false);
        this.clock.tick(1000);
        assert.deepEqual(
          MockNavigatorSettings.mSettings['ril.iccInfo.mbdn'],
          [FAKE_VOICEMAIL_NUMBER, '']
        );
      });
    });

    suite('should set to correct field based on icc card index', function() {
      setup(function() {
        this.ovh._iccCardIndex = 1;
      });

      test('system update is true', function() {
        MockNavigatorSettings.mSet({
          'ril.iccInfo.mbdn': ['', ORIGINAL_VOICEMAIL_NUMBER]
        });
        this.ovh.updateVoicemailSettings(FAKE_VOICEMAIL_NUMBER, true);
        this.clock.tick(1000);
        assert.deepEqual(
          MockNavigatorSettings.mSettings['ril.iccInfo.mbdn'],
          ['', ORIGINAL_VOICEMAIL_NUMBER]
        );
      });

      test('system update is false', function() {
        MockNavigatorSettings.mSet({
          'ril.iccInfo.mbdn': ['', ORIGINAL_VOICEMAIL_NUMBER]
        });
        this.ovh.updateVoicemailSettings(FAKE_VOICEMAIL_NUMBER, false);
        this.clock.tick(1000);
        assert.deepEqual(
          MockNavigatorSettings.mSettings['ril.iccInfo.mbdn'],
          ['', FAKE_VOICEMAIL_NUMBER]
        );
      });
    });
  });

  suite('getVMNumberFromOperatorVariantSettings', function() {
    setup(function() {
      this.ovh = new OperatorVariantHandler(FAKE_ICC_ID, FAKE_ICC_CARD_INDEX);
    });

    test('with operator variant voicemail number', function() {
      this.allSettings = [{
        'type': 'operatorvariant',
        'voicemail': FAKE_VOICEMAIL_NUMBER
      }];
      var number =
        this.ovh.getVMNumberFromOperatorVariantSettings(this.allSettings);
      assert.equal(number, FAKE_VOICEMAIL_NUMBER);
    });

    test('without operator variant voicemail number', function() {
      this.allSettings = [];
      var number =
        this.ovh.getVMNumberFromOperatorVariantSettings(this.allSettings);
      assert.equal(number, '');
    });
  });
});
