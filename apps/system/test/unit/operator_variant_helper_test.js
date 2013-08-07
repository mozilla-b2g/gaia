'use strict';

requireApp('system/shared/test/unit/mocks/mock_icc_helper.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_mobile_connection.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');

requireApp('system/shared/js/operator_variant_helper.js');

var mocksForOperatorVariant = new MocksHelper([
  'IccHelper'
]).init();

suite('operator variant helper', function() {
  const EXPECTED_MCC = 123;
  const EXPECTED_MNC = 456;
  const EXPECTED_ICC_INFO = { mcc: EXPECTED_MCC, mnc: EXPECTED_MNC };
  const NULL_ICC_INFO = { mcc: 0, mnc: 0 };
  const PERSIST_KEY = 'operator_variant_helper_test.customize';

  var realMozMobileConnection;
  var realMozSettings;

  var helper;

  mocksForOperatorVariant.attachTestHelpers();
  suiteSetup(function() {
    MockIccHelper.mProps.cardState = 'ready';

    realMozMobileConnection = navigator.mozMobileConnection;
    navigator.mozMobileConnection = MockNavigatorMozMobileConnection;

    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
  });

  suiteTeardown(function() {
    navigator.mozMobileConnection = realMozMobileConnection;
    navigator.mozSettings = realMozSettings;
  });

  setup(function() {
    MockNavigatorMozMobileConnection.iccInfo = EXPECTED_ICC_INFO;
  });

  teardown(function() {
    MockNavigatorMozMobileConnection.iccInfo = NULL_ICC_INFO;
    helper.revert();
    helper = null;
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
      'operator_variant_helper_test.customize',
      true
    );
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

        helper.listen(false);
        helper.applied();

        done();
      },
      PERSIST_KEY,
      false
    );

    helper.listen();
    MockNavigatorMozMobileConnection.triggerEventListeners('iccinfochange', {});
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
      },
      PERSIST_KEY,
      true
    );

    helper = new OperatorVariantHelper(
      function(mcc, mnc) {
        assert.isTrue(false, 'Listener should *not* have been called');
      },
      PERSIST_KEY,
      true
    );
  });

});
