'use strict';

requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_icc_manager.js');

requireApp('system/shared/js/operator_variant_helper.js');

suite('operator variant helper', function() {
  const FAKE_ICC_ID = '8934071100276980483';
  const FAKE_ICC_CARD_INDEX = '0';
  const EXPECTED_MCC = '123';
  const EXPECTED_MNC = '45';
  const EXPECTED_ICC_INFO = { mcc: EXPECTED_MCC, mnc: EXPECTED_MNC };
  const NULL_ICC_INFO = { mcc: '', mnc: '' };
  const PERSIST_KEY = 'operator_variant_helper_test.customize';

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
    });

    test('without iccId', function() {
      function createHelperShouldThrow() {
        helper = new OperatorVariantHelper(
          '0',
          FAKE_ICC_CARD_INDEX,
          function(mcc, mnc) {
            assert.false(true, 'Code should not be reached.');
          },
          'operator_variant_helper_test.customize',
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
});
