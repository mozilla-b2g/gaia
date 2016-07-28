/* global dataRoamingCustomizer */
'use strict';

require('/test/unit/mock_navigator_moz_settings.js');
require('/js/customizers/customizer.js');
require('/js/customizers/data_roaming_customizer.js');


suite('DataRoaming customizer >', function() {
  var TINY_TIMEOUT = 20;
  var DATA_ROAMING_SETTING = 'ril.data.roaming_enabled';

  var realSettings;

  var testCases = [
    {
      title: 'Set true value. SIM present on first boot > ',
      inputValue: true,
      currentValue: false,
      expectedValue: true,
      simPresentOnFirstBoot: true
    },
    {
      title: 'Set false value. SIM present on first boot > ',
      inputValue: false,
      currentValue: false,
      expectedValue: false,
      simPresentOnFirstBoot: true
    },
    {
      title:
        'Set false value, setting no defined when SIM present on first boot > ',
      inputValue: false,
      expectedValue: false,
      simPresentOnFirstBoot: true
    },
    {
      title:
        'Set true value, setting no defined when SIM present on first boot > ',
      inputValue: true,
      expectedValue: true,
      simPresentOnFirstBoot: true
    },
    {
      title: 'Set to wrong value,(default false) SIM present on first boot > ',
      inputValue: 12,
      currentValue: false,
      expectedValue: false,
      simPresentOnFirstBoot: true
    },
    {
      title: 'set true value. Previous RUN with no SIM (or unconfigured one)> ',
      inputValue: true,
      expectedValue: undefined,
      simPresentOnFirstBoot: false
    },
    {
      title: 'set false value. Previous RUN with no SIM (or unconfigured one)>',
      inputValue: false,
      expectedValue: undefined,
      simPresentOnFirstBoot: false
    },
    {
      title: 'Set false value. Expected value do not change >',
      inputValue: false,
      simPresentOnFirstBoot: false,
      currentValue: true,
      expectedValue: true
    },
    {
      title: 'Set true value. Expected value do not change  >',
      inputValue: true,
      simPresentOnFirstBoot: false,
      currentValue: false,
      expectedValue: false
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
    this.sinon.useFakeTimers();
  });

  teardown(function() {
    navigator.mozSettings.mTeardown();
    this.sinon.clock.restore();
  });

  testCases.forEach(function(testCase) {
    test(testCase.title, function() {
      if (testCase.currentValue !== undefined) {
        window.MockNavigatorSettings.mSettings[DATA_ROAMING_SETTING] =
          testCase.currentValue;
      }
      dataRoamingCustomizer.simPresentOnFirstBoot =
        testCase.simPresentOnFirstBoot;
      dataRoamingCustomizer.set(testCase.inputValue);
      this.sinon.clock.tick(TINY_TIMEOUT);
      var mSettings = window.MockNavigatorSettings.mSettings;
      assert.strictEqual(mSettings[DATA_ROAMING_SETTING],
                         testCase.expectedValue,
                         DATA_ROAMING_SETTING + ' has a incorrect value');
    });
  });
});
