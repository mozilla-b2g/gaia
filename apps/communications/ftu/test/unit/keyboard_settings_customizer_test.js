/* global keyboardSettingsCustomizer */

'use strict';

requireApp('communications/ftu/js/customizers/customizer.js');
requireApp(
  'communications/ftu/js/customizers/keyboard_settings_customizer.js');
requireApp('communications/ftu/test/unit/mock_navigator_moz_settings.js');

suite('Keyboard settings customizer >', function() {
  var realSettings;
  var TINY_TIMEOUT = 20;
  var ALL_KBD_SETTINGS = ['keyboard.vibration', 'keyboard.autocorrect',
                          'keyboard.clicksound', 'keyboard.wordsuggestion'];

  var testCases = [
    {
      title: 'set all posible options with valid values > ',
      inputValues: {
        'vibration': false,
        'autocorrect': true,
        'clicksound': false,
        'wordsuggestion': true
      },
      expectedValues: {
        'keyboard.vibration': false,
        'keyboard.autocorrect': true,
        'keyboard.clicksound': false,
        'keyboard.wordsuggestion': true
      }
    },
    {
      title: 'set invalid values > ',
      inputValues: {
        'vibration': [],
        'wordsuggestion': 'aFakeValue',
        'clicksound': {}
      },
      expectedValues: {
        'keyboard.vibration': undefined,
        'keyboard.autocorrect': undefined,
        'keyboard.clicksound': undefined,
        'keyboard.wordsuggestion': undefined
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
    var numSet = ALL_KBD_SETTINGS.length;
    for (var i = 0; i < numSet; i++) {
      delete window.MockNavigatorSettings.mSettings[ALL_KBD_SETTINGS[i]];
    }
    this.sinon.useFakeTimers();
  });

  teardown(function() {
    this.sinon.clock.restore();
  });

  testCases.forEach(function(testCase) {
    test(testCase.title, function() {
      keyboardSettingsCustomizer.set(testCase.inputValues);
      this.sinon.clock.tick(TINY_TIMEOUT);
      var mSettings = window.MockNavigatorSettings.mSettings;
      for (var key in testCase.expectedValues) {
        assert.strictEqual(mSettings[key], testCase.expectedValues[key],
                           key + ' have a incorrect value');
      }
    });
  });
});
