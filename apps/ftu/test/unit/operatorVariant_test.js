/* global MocksHelper, MockNavigatorSettings, MockIccHelper, OperatorVariant */
'use strict';

require('/shared/test/unit/mocks/mock_icc_helper.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');

requireApp('ftu/js/operatorVariant.js');

var mocksHelper = new MocksHelper([
  'IccHelper'
]).init();


suite('operatorVariant set First run state >', function() {
  const KEY_SIM_ON_1ST_RUN = 'ftu.simPresentOnFirstBoot';
  var SAVE_STATE_WAIT_TIMEOUT = 200;
  var realSettings;

  suiteSetup(function() {
    mocksHelper.suiteSetup();
    realSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
  });

  suiteTeardown(function() {
    mocksHelper.suiteTeardown();
    navigator.mozSettings = realSettings;
    realSettings = null;
  });

  // helper to change single key-value of mozSettings
  function changeSettings(key, value) {
    var cset = {};
    cset[key] = value;
    MockNavigatorSettings.createLock().set(cset);
  }


  setup(function() {
    mocksHelper.setup();
  });

  var testCases = [
  {
  'title': 'Operator Variant set first run type - no previously value, ' +
           'known mcc-mnc',
  'preValSet': undefined,
  'cardState': 'ready',
  'iccInfo': {
    'mcc': '214',
    'mnc': '07'
  },
  'expecValSet': '214-007'
  },
  {
  'title': 'Operator Variant set first run type - no previously value, ' +
           'unknown mcc-mnc',
  'preValSet': undefined,
  'cardState': 'ready',
  'iccInfo': {},
  'expecValSet': '000-000'
  },
  {
  'title': 'Operator Variant first run type - previously value different ' +
           'of the current one',
  'preValSet': '333-333',
  'cardState': 'ready',
  'iccInfo': {
    'mcc': '214',
    'mnc': '07'
  },
  'expecValSet': '333-333'
  },
  {
  'title': 'Operator Variant set first run - no previously value, no cardState',
  'preValSet': undefined,
  'cardState': undefined,
  'iccInfo': {
    'mcc': '214',
    'mnc': '07'
  },
  'expecValSet': '000-000'
  },
  {
  'title': 'Operator Variant first run - has previously value, no cardState',
  'preValSet': '444-444',
  'cardState': undefined,
  'iccInfo': {
    'mcc': '214',
    'mnc': '07'
  },
  'expecValSet': '444-444'
  }
  ];

  testCases.forEach((function(testCase) {
    test(testCase.title, function(done) {
      MockIccHelper.mProps.cardState = testCase.cardState;
      MockIccHelper.mProps.iccInfo = testCase.iccInfo;
      changeSettings(KEY_SIM_ON_1ST_RUN, testCase.preValSet);
      OperatorVariant.setSIMOnFirstBootState();
      setTimeout(function() {
        var mSettings = MockNavigatorSettings.mSettings;
        assert.equal(mSettings[KEY_SIM_ON_1ST_RUN], testCase.expecValSet);
        done();
      }, SAVE_STATE_WAIT_TIMEOUT);
    });
  }));
});
