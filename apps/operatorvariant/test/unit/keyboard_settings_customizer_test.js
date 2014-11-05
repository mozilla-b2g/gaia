/* global keyboardSettingsCustomizer, requireApp, suite, suiteSetup,
   suiteTeardown, setup, teardown, test, assert */

'use strict';

requireApp('operatorvariant/test/unit/mock_navigator_moz_settings.js');

requireApp('operatorvariant/js/customizers/customizer.js');
requireApp('operatorvariant/js/customizers/keyboard_settings_customizer.js');

suite('Keyboard settings customizer >', function() {
  const TINY_TIMEOUT = 20;
  var realSettings;

  var testCases = [
    {
      title: 'First run with valid SIM - options with valid values > ',
      inputValues: {
        'values': {
          'keyboard.vibration': false,
          'keyboard.autocorrect': true,
          'keyboard.clicksound': false,
          'keyboard.wordsuggestion': true
        }
      },
      actualValues: {
          'keyboard.vibration': true,
          'keyboard.autocorrect': true,
          'keyboard.clicksound': false,
          'keyboard.wordsuggestion': true
      },
      expectedValues: {
        'keyboard.vibration': false,
        'keyboard.autocorrect': true,
        'keyboard.clicksound': false,
        'keyboard.wordsuggestion': true
      },
      simPresentOnFirstBoot: true
    },
    {
      title: 'First Run with valid SIM - set invalid values > ',
      inputValues: {
        'values': {
          'keyboard.vibration': [],
          'keyboard.wordsuggestion': 'aFakeValue',
          'keyboard.clicksound': {}
        }
      },
      'actualValues': {
        'keyboard.vibration': true,
        'keyboard.autocorrect': true,
        'keyboard.clicksound': false,
        'keyboard.wordsuggestion': true
      },
      expectedValues: {
        'keyboard.vibration': true,
        'keyboard.autocorrect': true,
        'keyboard.clicksound': false,
        'keyboard.wordsuggestion': true
      },
      simPresentOnFirstBoot: true
    },
    {
      title: 'first run without valid SIM > ',
      inputValues: {
        'values': {
          'keyboard.vibration': false,
          'keyboard.autocorrect': true,
          'keyboard.clicksound': false,
          'keyboard.wordsuggestion': true
        }
      },
      'actualValues': {
        'keyboard.vibration': true,
        'keyboard.autocorrect': true,
        'keyboard.clicksound': undefined,
        'keyboard.wordsuggestion': true
      },
      expectedValues: {
        'keyboard.vibration': true,
        'keyboard.autocorrect': true,
        'keyboard.clicksound': undefined,
        'keyboard.wordsuggestion': true
      },
      simPresentOnFirstBoot: false
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
      var actualValues = testCase.actualValues;
      for (var avKey in actualValues) {
        window.MockNavigatorSettings.mSettings[avKey] = actualValues[avKey];
      }
      keyboardSettingsCustomizer.simPresentOnFirstBoot =
        testCase.simPresentOnFirstBoot;
      keyboardSettingsCustomizer.set(testCase.inputValues);
      this.sinon.clock.tick(TINY_TIMEOUT);
      var mSettings = window.MockNavigatorSettings.mSettings;
      for (var evKey in testCase.expectedValues) {
        assert.strictEqual(mSettings[evKey], testCase.expectedValues[evKey],
                           evKey + ' has a incorrect value');
      }
    });
  });
});
