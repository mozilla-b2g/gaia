'use strict';

requireApp('system/shared/test/unit/mocks/mock_icc_helper.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');

requireApp('system/shared/js/operator_variant_helper.js');

var mocksForOperatorVariant = new MocksHelper([
  'IccHelper'
]).init();

suite('operator variant helper', function() {
  const EXPECTED_MCC = '123';
  const EXPECTED_MNC = '45';
  const EXPECTED_ICC_INFO = { mcc: EXPECTED_MCC, mnc: EXPECTED_MNC };
  const NULL_ICC_INFO = { mcc: '', mnc: '' };
  const PERSIST_KEY = 'operator_variant_helper_test.customize';

  var realMozSettings;

  var helper;

  mocksForOperatorVariant.attachTestHelpers();
  suiteSetup(function() {
    MockIccHelper.mProps.cardState = 'ready';

    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
  });

  suiteTeardown(function() {
    navigator.mozSettings = realMozSettings;
  });

  setup(function() {
    MockIccHelper.mProps.enabled = true;
    MockIccHelper.mProps.iccInfo = EXPECTED_ICC_INFO;
  });

  teardown(function() {
    MockIccHelper.mProps.iccInfo = NULL_ICC_INFO;
    if (helper) {
      helper.revert();
    }
    helper = null;
  });

  test('icchelper disabled', function() {
    MockIccHelper.mProps.enabled = false;

    function createHelperShouldThrow() {
      helper = new OperatorVariantHelper(
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
      /Expected IccHelper to be enabled./
    );
  });

  test('listen for iccinfochange (checkNow = true)', function(done) {
    helper = new OperatorVariantHelper(
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
    MockIccHelper.mTriggerEventListeners('iccinfochange', {});
  });

  test('listen for iccinfochange only fires once', function() {
    helper = new OperatorVariantHelper(
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
      function(mcc, mnc) {
        assert.isTrue(false, 'Listener should *not* have been called');
      },
      PERSIST_KEY,
      true
    );
    helper.listen();
  });

});
