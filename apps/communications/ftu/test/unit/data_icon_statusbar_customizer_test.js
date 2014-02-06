/* global dataIconStatubarCustomizer */

'use strict';

requireApp('communications/ftu/js/customizers/customizer.js');
requireApp(
  'communications/ftu/js/customizers/data_icon_statusbar_customizer.js');
requireApp(
  'communications/shared/test/unit/mocks/mock_navigator_moz_settings.js');

suite('Data icon statusbar customizer >', function() {
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
    realSettings = null;
  });

  setup(function() {
    window.MockNavigatorSettings.mSettings[SETTING_DATA_ICON] = '{}';
    this.sinon.useFakeTimers();
  });

  teardown(function() {
    this.sinon.clock.restore();
  });

  testCases.forEach(function(testCase) {
    test(testCase.title, function() {
      dataIconStatubarCustomizer.set(testCase.values);
      this.sinon.clock.tick(TINY_TIMEOUT);
      var mSettings = window.MockNavigatorSettings.mSettings;
      assert.deepEqual(mSettings[SETTING_DATA_ICON], testCase.values);
    });
  });
});
