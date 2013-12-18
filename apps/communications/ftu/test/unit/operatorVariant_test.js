'use strict';

requireApp('communications/shared/test/unit/mocks/mock_icc_helper.js');
requireApp('communications/ftu/test/unit/mock_navigator_moz_settings.js');

requireApp('communications/ftu/js/operatorVariant.js');

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
  'preValSet': undefined,
  'expecValSet': false,
  'cardState': 'unknown',
  'title': 'Operator Variant set first run type - unkown sim'
  },
  {
  'preValSet': undefined,
  'expecValSet': true,
  'cardState': 'ready',
  'title': 'Operator Variant set first run type - sim ready'
  },
  {
  'preValSet': undefined,
  'expecValSet': false,
  'cardState': 'pinRequired',
  'title': 'Operator Variant set first run type - sim pinRequired'
  },
  {
  'preValSet': true,
  'expecValSet': true,
  'cardState': 'ready',
  'title': 'Operator Variant first run type previously set true'
  },
  {
  'preValSet': false,
  'expecValSet': false,
  'cardState': 'ready',
  'title': 'Operator Variant set first run type previously set false'
  }
  ];

  testCases.forEach((function(testCase) {
    test(testCase.title, function(done) {
      MockIccHelper.mProps['cardState'] = testCase.cardState;
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
