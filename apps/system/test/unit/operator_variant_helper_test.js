'use strict';

requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_icc_manager.js');

requireApp('system/shared/js/operator_variant_helper.js');

suite('operator variant helper', function() {
  const DEVICE_INFO_OS = '1.3.0.0-prerelease';
  const FAKE_ICC_ID = '8934071100276980483';
  const FAKE_ICC_CARD_INDEX = '0';
  const EXPECTED_MCC = '123';
  const EXPECTED_MNC = '45';
  const EXPECTED_ICC_INFO = { mcc: EXPECTED_MCC, mnc: EXPECTED_MNC };
  const NULL_ICC_INFO = { mcc: '', mnc: '' };
  const PERSIST_KEY_PREFIX = 'operatorvariant';
  const PERSIST_KEY_SUFIX = 'customization';
  const PERSIST_KEY = PERSIST_KEY_PREFIX + '.' +
                      DEVICE_INFO_OS + '.' +
                      PERSIST_KEY_SUFIX;
  const MCC_SETTINGS_KEY = 'operatorvariant.mcc';
  const MNC_SETTINGS_KEY = 'operatorvariant.mnc';

  var realMozSettings, realMozIccManager;

  var mozIcc;

  var helper;

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

  suite('mozIcc object always present', function() {
    setup(function() {
      mozIcc = {
        'cardState': 'ready'
      };
      MockNavigatorMozIccManager.addIcc(FAKE_ICC_ID, mozIcc);
      MockNavigatorMozIccManager.getIccById(FAKE_ICC_ID).iccInfo =
        EXPECTED_ICC_INFO;
    });

    teardown(function() {
      MockNavigatorMozIccManager.mTeardown();
      if (helper) {
        helper.revert();
      }
      helper = null;
      MockNavigatorSettings.mTeardown();
    });

    test('without iccId', function() {
      function createHelperShouldThrow() {
        helper = new OperatorVariantHelper(
          '0',
          FAKE_ICC_CARD_INDEX,
          function(mcc, mnc) {
            assert.false(true, 'Code should not be reached.');
          },
          PERSIST_KEY,
          true
        );
      }

      assert.throw(
        createHelperShouldThrow,
        Error,
        /iccId and iccCardIndex arguments must have a value!/
      );
    });

    test('listen for iccinfochange (checkNow = true)', function(done) {
      helper = new OperatorVariantHelper(
        FAKE_ICC_ID,
        FAKE_ICC_CARD_INDEX,
        function(mcc, mnc) {
          assert.equal(
            EXPECTED_MCC,
            mcc,
            'Expected MCC value of ' + EXPECTED_MCC
          );
          assert.equal(
            EXPECTED_MNC,
            mnc,
            'Expected MNC value of ' + EXPECTED_MNC
          );
          helper.applied();
          done();
        },
        PERSIST_KEY,
        true
      );
      helper.listen();
    });

    test('listen for iccinfochange (checkNow = false)', function(done) {
      helper = new OperatorVariantHelper(
        FAKE_ICC_ID,
        FAKE_ICC_CARD_INDEX,
        function(mcc, mnc) {
          assert.equal(
            EXPECTED_MCC,
            mcc,
            'Expected MCC value of ' + EXPECTED_MCC
          );
          assert.equal(
            EXPECTED_MNC,
            mnc,
            'Expected MNC value of ' + EXPECTED_MNC
          );
          helper.applied();
          done();
        },
        PERSIST_KEY,
        false
      );

      helper.listen();
      MockNavigatorMozIccManager.getIccById(FAKE_ICC_ID).triggerEventListeners(
        'iccinfochange', {}
      );
    });

    test('listen for iccinfochange only fires once', function() {
      helper = new OperatorVariantHelper(
        FAKE_ICC_ID,
        FAKE_ICC_CARD_INDEX,
        function(mcc, mnc) {
          assert.equal(
            EXPECTED_MCC,
            mcc,
            'Expected MCC value of ' + EXPECTED_MCC
          );
          assert.equal(
            EXPECTED_MNC,
            mnc,
            'Expected MNC value of ' + EXPECTED_MNC
          );
          helper.applied();
        },
        PERSIST_KEY,
        true
      );
      helper.listen();

      helper = new OperatorVariantHelper(
        FAKE_ICC_ID,
        FAKE_ICC_CARD_INDEX,
        function(mcc, mnc) {
          assert.isTrue(false, 'Listener should *not* have been called');
        },
        PERSIST_KEY,
        true
      );
      helper.listen();
    });
  });

  suite('Remove mozIcc object', function() {
    setup(function() {
      mozIcc = {
        'cardState': 'ready'
      };
      MockNavigatorMozIccManager.addIcc(FAKE_ICC_ID, mozIcc);
      MockNavigatorMozIccManager.getIccById(FAKE_ICC_ID).iccInfo =
        EXPECTED_ICC_INFO;
    });

    teardown(function() {
      MockNavigatorMozIccManager.mTeardown();
      if (helper) {
        helper.revert();
      }
      helper = null;
      MockNavigatorSettings.mTeardown();
    });

    test('listen for iccinfochange (checkNow = false)', function(done) {
      helper = new OperatorVariantHelper(
        FAKE_ICC_ID,
        FAKE_ICC_CARD_INDEX,
        function(mcc, mnc) {
          MockNavigatorMozIccManager.removeIcc(FAKE_ICC_ID);
          assert.equal(
            EXPECTED_MCC,
            mcc,
            'Expected MCC value of ' + EXPECTED_MCC
          );
          assert.equal(
            EXPECTED_MNC,
            mnc,
            'Expected MNC value of ' + EXPECTED_MNC
          );
          helper.applied();
          done();
        },
        PERSIST_KEY,
        false
      );

      helper.listen();
      MockNavigatorMozIccManager.getIccById(FAKE_ICC_ID).triggerEventListeners(
        'iccinfochange', {}
      );
    });
  });

  suite('FOTA updates', function() {
    setup(function() {
      mozIcc = {
        'cardState': 'ready'
      };
      MockNavigatorMozIccManager.addIcc(FAKE_ICC_ID, mozIcc);
      MockNavigatorMozIccManager.getIccById(FAKE_ICC_ID).iccInfo =
        EXPECTED_ICC_INFO;

      var mcc = {}, mnc = {}, persistSetting = {};

      mcc[MCC_SETTINGS_KEY] = EXPECTED_MCC;
      mnc[MNC_SETTINGS_KEY] = EXPECTED_MNC;
      persistSetting[PERSIST_KEY] = true;

      var transaction = MockNavigatorSettings.createLock();
      transaction.set(mcc);
      transaction.set(mnc);
      transaction.set(persistSetting);
    });

    teardown(function() {
      MockNavigatorMozIccManager.mTeardown();
      if (helper) {
        helper.revert();
      }
      helper = null;
      MockNavigatorSettings.mTeardown();
    });

    test('Customization should not run again', function() {
      helper = new OperatorVariantHelper(
        FAKE_ICC_ID,
        FAKE_ICC_CARD_INDEX,
        function(mcc, mnc) {
          assert.isTrue(false, 'Listener should *not* have been called');
        },
        PERSIST_KEY,
        false
      );

      helper.listen();

      MockNavigatorMozIccManager.getIccById(FAKE_ICC_ID).triggerEventListeners(
        'iccinfochange', {}
      );
    });

    test('Customization should run again', function(done) {
      helper = new OperatorVariantHelper(
        FAKE_ICC_ID,
        FAKE_ICC_CARD_INDEX,
        function(mcc, mnc, persistKeyNotSet) {
          assert.equal(persistKeyNotSet, true);
          helper.applied();
          done();
        },
        PERSIST_KEY_PREFIX + '.' +
        '1.4.0.0-prerelease' + '.' +
        PERSIST_KEY_SUFIX,
        false
      );

      helper.listen();

      MockNavigatorMozIccManager.getIccById(FAKE_ICC_ID).triggerEventListeners(
        'iccinfochange', {}
      );
    });
  });
});
