/* global networkTypeCustomizer, requireApp, suite, suiteSetup,
   suiteTeardown, setup, teardown, test, assert */

'use strict';

requireApp(
  'operatorvariant/shared/test/unit/mocks/mock_navigator_moz_settings.js');

requireApp('operatorvariant/js/customizers/customizer.js');
requireApp('operatorvariant/js/customizers/network_type_customizer.js');

suite('Network type customizer >', function() {
  var realSettings;
  var TINY_TIMEOUT = 10;
  var SETTING_DATA_ICON = 'operatorResources.data.icon';
  var testCases = [
    {
      title: 'set > ',
      values: {
        'lte': '4GChng',
        'ehrpd': '4GChng',
        'hspa+': 'H+Chng',
        'hsdpa': 'HChng', 'hsupa': 'HChng', 'hspa': 'HChng'
      }
    }
  ];

  suiteSetup(function() {
    realSettings = navigator.mozSettings;
    navigator.mozSettings = window.MockNavigatorSettings;
  });

  suiteTeardown(function() {
    navigator.mozSettings = realSettings;
  });

  setup(function() {
    window.MockNavigatorSettings.mSettings[SETTING_DATA_ICON] = '{}';
    this.sinon.useFakeTimers();
  });

  teardown(function() {
    navigator.mozSettings.mTeardown();
    this.sinon.clock.restore();
  });

  testCases.forEach(function(testCase) {
    test(testCase.title, function() {
      networkTypeCustomizer.set(testCase.values);
      this.sinon.clock.tick(TINY_TIMEOUT);
      var mSettings = window.MockNavigatorSettings.mSettings;
      assert.deepEqual(mSettings[SETTING_DATA_ICON], testCase.values);
    });
  });
});
