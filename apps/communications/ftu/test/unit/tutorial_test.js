/* global Tutorial, ScreenLayout, TutorialSteps */
'use strict';

requireApp('communications/ftu/test/unit/mock_screenlayout.js');
requireApp('communications/ftu/test/unit/mock_ui_manager.js');
requireApp('communications/ftu/test/unit/mock_tutorial_navigator.js');
requireApp('communications/ftu/js/utils.js');
requireApp('communications/ftu/js/tutorial_steps.js');
requireApp('communications/ftu/js/tutorial.js');

mocha.globals(['_', 'WifiManager']);

var mocksHelperForFTU = new MocksHelper([
  'UIManager',
  'ScreenLayout'
]).init();

suite('Tutorial >', function() {

  var mocksHelper = mocksHelperForFTU;
  var real_ = null;
  var realMozApps;
  var realWifiManager;
  var stubById;

  suiteSetup(function() {
    stubById = sinon.stub(document, 'getElementById').returns(
      document.createElement('div'));

    real_ = window._;
    window._ = function() { };

    realMozApps = window.navigator.mozApps;
    window.navigator.mozApps = {
      isExecuted: false,
      getSelf: function() {
        this.isExecuted = true;
        return {};
      }
    };

    realWifiManager = window.WifiManager;
    window.WifiManager = {
      finish: function() {}
    };

    mocksHelper.suiteSetup();
  });

  suiteTeardown(function() {
    mocksHelper.suiteTeardown();
    stubById.restore();
    Tutorial.exit();

    window.navigator.mozApps = realMozApps;
    window._ = real_;
    window.WifiManager = realWifiManager;

  });

  suite('tiny device > ', function() {

    suiteSetup(function() {
      Tutorial.init();
    });

    suiteTeardown(function() {
      Tutorial.jumpTo(1);
    });

    test('forward', function() {
      Tutorial.forward();
      assert.equal(Tutorial.currentStep, 2);
    });

    test('back', function() {
      Tutorial.jumpTo(2);
      Tutorial.back();
      assert.equal(Tutorial.currentStep, 1);
    });

    test('jumpTo 2', function() {
      Tutorial.jumpTo(2);
      assert.equal(Tutorial.currentStep, 2);
    });

    test('jumpToExitStep', function() {
      Tutorial.jumpToExitStep();
      assert.include(Tutorial.tutorialScreen.Finish, 'show');
    });
  });

  suite('large device > ', function() {

    suiteSetup(function() {
      ScreenLayout.setDevice('large');
      Tutorial.init();
      });

    suiteTeardown(function() {
      Tutorial.jumpTo(1);
    });

    test('forward', function() {
      Tutorial.forward();
      assert.equal(Tutorial.currentStep, 2);
    });

    test('back', function() {
      Tutorial.jumpTo(2);
      Tutorial.back();
      assert.equal(Tutorial.currentStep, 1);
    });

    test('jumpTo 2', function() {
      Tutorial.jumpTo(2);
      assert.equal(Tutorial.currentStep, 2);
    });

    test('jumpToExitStep', function() {
      Tutorial.jumpToExitStep();
      assert.ok(navigator.mozApps.isExecuted);
      assert.include(Tutorial.tutorialScreen.Finish, 'show');
    });
  });
});
