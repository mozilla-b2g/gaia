/* global requireApp, suite, teardown, suiteSetup, suiteTeardown, setup, test,
   assert, nfcCustomizer */
'use strict';

requireApp('operatorvariant/test/unit/mock_navigator_moz_settings.js');
requireApp('operatorvariant/js/customizers/customizer.js');
requireApp('operatorvariant/js/customizers/nfc_customizer.js');


suite('NFC customizer >', function() {
  const TINY_TIMEOUT = 20;
  const NFC_SETTING = 'nfc.enabled';

  var realSettings;

  var testCases = [
    {
      title: 'set true value. It has not changed previously > ',
      inputValue: {
        'isEnabled': true,
        'default': false
      },
      currentValue: false,
      expectedValue: true,
      simPresentOnFirstBoot: true
    },
    {
      title: 'set false value. It has not changed previously > ',
      inputValue: {
        'isEnabled': false,
        'default': false
      },
      currentValue: false,
      expectedValue: false,
      simPresentOnFirstBoot: true
    },
    {
      title: 'set true value. It has changed previously > ',
      inputValue: {
        'isEnabled': true,
        'default': false
      },
      currentValue: true,
      expectedValue: true,
      simPresentOnFirstBoot: true
    },
    {
      title: 'set false value. It has changed previously > ',
      inputValue: {
        'isEnabled': false,
        'default': false
      },
      currentValue: true,
      expectedValue: true,
      simPresentOnFirstBoot: true
    },
    {
      title: 'set true value. Previously value undefined > ',
      inputValue: {
        'isEnabled': true,
        'default': false
      },
      currentValue: undefined,
      expectedValue: true,
      simPresentOnFirstBoot: true
    },
    {
      title: 'set false value. Previous value undefined > ',
      inputValue: {
        'isEnabled': false,
        'default': false
      },
      currentValue: undefined,
      expectedValue: false,
      simPresentOnFirstBoot: true
    },
    {
      title: 'set true value. Previous RUN with no SIM (or unconfigured one)> ',
      inputValue: {
        'isEnabled': true,
        'default': false
      },
      expectedValue: undefined,
      simPresentOnFirstBoot: false
    },
    {
      title: 'set false value. Previous RUN with no SIM (or unconfigured one)>',
      inputValue: {
        'isEnabled': false,
        'default': false
      },
      expectedValue: undefined,
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
      if (testCase.currentValue !== undefined) {
        window.MockNavigatorSettings.mSettings[NFC_SETTING] =
          testCase.currentValue;
      }
      nfcCustomizer.simPresentOnFirstBoot = testCase.simPresentOnFirstBoot;
      nfcCustomizer.set(testCase.inputValue);
      this.sinon.clock.tick(TINY_TIMEOUT);
      var mSettings = window.MockNavigatorSettings.mSettings;
      assert.strictEqual(mSettings[NFC_SETTING], testCase.expectedValue,
                        NFC_SETTING + ' has a incorrect value');
    });
  });
});
