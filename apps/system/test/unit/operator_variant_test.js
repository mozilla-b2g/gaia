'use strict';

requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_icc_manager.js');

requireApp('system/shared/js/operator_variant_helper.js');
requireApp('system/js/operator_variant/operator_variant.js');

suite('Operator variant', function() {
  const FAKE_ICC_ID = '8934071100276980483';
  const FAKE_ICC_CARD_INDEX = '0';
  const TEST_NETWORK_MCC = '001';

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
    { key: 'ril.mms.carrier', value: 'Test Network' },
    { key: 'ril.mms.apn', value: 'internet' },
    { key: 'ril.mms.mmsc', value: 'http://127.0.0.1' },
    { key: 'ril.mms.mmsproxy', value: '127.0.0.1' },
    { key: 'ril.mms.mmsport', value: '8080' },
    { key: 'ril.data.carrier', value: 'Test Network' },
    { key: 'ril.iccInfo.mbdn', value: '999999' },
    { key: 'ril.cellbroadcast.searchlist', value: '0,1,2,3' }
  ];

  var realMozSettings, realMozIccManager;

  var mozIcc;

  suiteSetup(function() {
    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    realMozIccManager = navigator.mozIccManager;
    navigator.mozIccManager = MockNavigatorMozIccManager;
  });

  suiteTeardown(function() {
    navigator.mozSettings = realMozSettings;
    navigator.mozIccManager = realMozIccManager;
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
  });

  teardown(function() {
    MockNavigatorMozIccManager.mTeardown();
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
});
