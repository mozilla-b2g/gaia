'use strict';

/* global UIManager, DataMobile, MocksHelper, Navigation */

require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('ftu/test/unit/mock_ui_manager.js');
requireApp('ftu/js/navigation.js');
requireApp('ftu/js/data_mobile.js');

suite('mobile data >', function() {
  var mocksHelperForDataMobile = new MocksHelper([
      'UIManager'
  ]).init();

  var realSettings,
      settingToggleKey = 'ril.data.enabled',
      settingApnKey = 'ril.data.apnSettings';
  var TINY_TIMEOUT = 30;

  suiteSetup(function() {
    mocksHelperForDataMobile.suiteSetup();
    realSettings = navigator.mozSettings;
    navigator.mozSettings = window.MockNavigatorSettings;

    DataMobile.init();
  });

  suiteTeardown(function() {
    mocksHelperForDataMobile.suiteTeardown();
    navigator.mozSettings = realSettings;
    realSettings = null;
  });

  suite('Load APN values from database', function() {
    var result;

    setup(function(done) {
      window.MockNavigatorSettings.mSettings[settingApnKey] = '[[]]';
      DataMobile.getAPN(function(response) {
        result = response;
        done();
      });
    });

    test('Values are loaded', function() {
      assert.isNotNull(result);
    });

    test('Observer is added before', function() {
      assert.isNotNull(window.MockNavigatorSettings.mObservers);
    });

    test('Observer is removed after', function() {
      assert.isNotNull(window.MockNavigatorSettings.mRemovedObservers);
    });
  });

  suite('Toggle status of mobile data', function() {
    test('toggle status of mobile data', function(done) {
      DataMobile.toggle(true, function() {
        assert.isTrue(window.MockNavigatorSettings.mSettings[settingToggleKey]);
        done();
      });
    });

    test('toggle status of mobile data', function(done) {
      DataMobile.toggle(false, function() {
        assert.isFalse(
          window.MockNavigatorSettings.mSettings[settingToggleKey]
        );
        done();
      });
    });
  });

  suite('Get data status', function() {

    var KEY = 'ril.data.enabled';
    var KEY_SV = 'ftu.ril.data.enabled';
    var clock;
    var realCurrentStep;
    var DATA_SCREEN = 2;

    var testCases = [
      {
        'title': 'On data screen. ' + KEY + '= true' + ' and ' + KEY_SV +
                 ' and switch modify by user',
        'currentStep': DATA_SCREEN,
        'isModifiedByUser': true,
        'key': true,
        'keySV': true,
        'expectedValue': true
      },
      {
        'title': 'On data screen. ' + KEY + '= false' + ' and ' + KEY_SV +
                 ' and switch modify by user',
        'currentStep': DATA_SCREEN,
        'isModifiedByUser': true,
        'key': false,
        'keySV': true,
        'expectedValue': false
      },
      {
        'title': 'On data screen. ' + KEY + '= true' + ' and not ' + KEY_SV,
        'currentStep': DATA_SCREEN,
        'key': true,
        'expectedValue': true
      },
      {
        'title': 'On data screen. ' + KEY + '= false' + ' and not ' + KEY_SV,
        'currentStep': DATA_SCREEN,
        'key': false,
        'expectedValue': false
      },
      {
        'title': 'On data screen. ' + KEY + '= true' + ' and ' + KEY_SV +
                 '= true',
        'currentStep': DATA_SCREEN,
        'key': true,
        'keySV': true,
        'expectedValue': true
      },
      {
        'title': 'On data screen. ' + KEY + '= true' + ' and ' + KEY_SV +
                 '= false',
        'currentStep': DATA_SCREEN,
        'key': true,
        'keySV': false,
        'expectedValue': false
      },
      {
        'title': 'On data screen. ' + KEY + '= false' + ' and ' + KEY_SV +
                 '= true',
        'currentStep': DATA_SCREEN,
        'key': false,
        'keySV': true,
        'expectedValue': true
      },
      {
        'title': 'On data screen. ' + KEY + '= false' + ' and ' + KEY_SV +
                 '= false',
        'currentStep': DATA_SCREEN,
        'key': false,
        'keySV': false,
        'expectedValue': false
      },
      {
        'title': 'Not on data screen. ' + KEY + '= true' + ' and ' + KEY_SV +
                 '= true',
        'currentStep': DATA_SCREEN + 1,
        'key': true,
        'keySV': true,
        'expectedValue': true
      },
      {
        'title': 'Not on data screen. ' + KEY + '= true' + ' and ' + KEY_SV +
                 '= false',
        'currentStep': DATA_SCREEN + 1,
        'key': true,
        'keySV': false,
        'expectedValue': true
      },
      {
        'title': 'Not on data screen. ' + KEY + '= false' + ' and ' + KEY_SV +
                 '= true',
        'currentStep': DATA_SCREEN + 1,
        'key': false,
        'keySV': true,
        'expectedValue': false
      },
      {
        'title': 'Not on data screen. ' + KEY + '= false' + ' and ' + KEY_SV +
                 '= false',
        'currentStep': DATA_SCREEN + 1,
        'key': false,
        'keySV': false,
        'expectedValue': false
      }
    ];

    suiteSetup(function() {
      realCurrentStep = Navigation.currentStep;
    });

    suiteTeardown(function() {
      Navigation.currentStep = realCurrentStep;
    });


    setup(function() {
      clock = this.sinon.useFakeTimers();
    });

    teardown(function() {
      clock.restore();
    });

    testCases.forEach(function(testCase) {
      test(testCase.title, function(done) {
        Navigation.currentStep = testCase.currentStep;
        UIManager.dataConnectionChangedByUsr = testCase.isModifiedByUser;
        window.MockNavigatorSettings.mSettings[KEY] = testCase.key;
        window.MockNavigatorSettings.mSettings[KEY_SV] = testCase.keySV;
        DataMobile.getStatus(function() {});
        clock.tick(TINY_TIMEOUT);
        assert.equal(DataMobile.isDataAvailable, testCase.expectedValue);
        done();
      });
    });
  });
});
