'use strict';

requireApp('communications/ftu/test/unit/mock_screenlayout.js');
requireApp('communications/ftu/test/unit/mock_ui_manager.js');
requireApp('communications/ftu/test/unit/mock_tutorial_navigator.js');
requireApp('communications/ftu/js/utils.js');
requireApp('communications/ftu/js/tutorial_steps.js');
requireApp('communications/ftu/js/tutorial.js');

mocha.globals(['_', 'ScreenLayout', 'TutorialSteps']);

var mocksHelperForFTU = new MocksHelper([
  'UIManager'
]).init();

suite('Tutorial >', function() {

  var mocksHelper = mocksHelperForFTU;
  var real_ = null;
  var realMozApps;
  var stubById;

  suiteSetup(function() {
    stubById = sinon.stub(document, 'getElementById').returns(
      document.createElement('div'));

    real_ = window._;
    realMozApps = window.navigator.mozApps;

    window._ = function() { };
    window.ScreenLayout = MockScreenLayout;
    window.UIManager = MockUIManager;
    window.navigator.mozApps = {
      isExecuted: false,
      getSelf: function() {
        this.isExecuted = true;
        return {};
      }
    };

    mocksHelper.suiteSetup();
  });

  suiteTeardown(function() {
    mocksHelper.suiteTeardown();

    mocksHelper.teardown();
    stubById.restore();

    window.navigator.mozApps = realMozApps;
    window._ = real_;
  });

  setup(function() {
    mocksHelper.setup();
  });

  suite('tiny device > ', function() {

    suiteTeardown(function() {
      Tutorial.jumpTo(1);
    });

    setup(function() {
      Tutorial.init();
    });

    test('forward', function() {
      Tutorial.forward();
      assert.equal(Tutorial.currentStep, 2);
    });

    test('back', function() {
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

    setup(function() {
      ScreenLayout.setDevice('large');
      Tutorial.init();
    });

    test('forward', function() {
      Tutorial.forward();
      assert.equal(Tutorial.currentStep, 2);
    });

    test('back', function() {
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
