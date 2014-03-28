'use strict';

requireApp('communications/ftu/test/unit/mock_screenlayout.js');

mocha.globals(['ScreenLayout', 'TutorialSteps']);

suite('TutorialSteps >', function() {

  var realScreenLayout;

  setup(function(done) {
    requireApp('communications/ftu/js/tutorial_steps.js', done);
  });

  suiteSetup(function() {
    realScreenLayout = window.ScreenLayout;
    window.ScreenLayout = MockScreenLayout;
  });

  suiteTeardown(function() {
    window.ScreenLayout = realScreenLayout;
  });

  test('Tiny devices', function() {
    var tutorialSteps = TutorialSteps.get();
    assert.isTrue(/1.png$/.test(tutorialSteps[1].image));
    assert.isTrue(/2.png$/.test(tutorialSteps[2].image));
  });

  test('Large devices', function() {
    ScreenLayout.setDevice('large');
    var tutorialSteps = TutorialSteps.get();
    assert.isTrue(/1_large.png$/.test(tutorialSteps[1].image));
    assert.isTrue(/2_large.png$/.test(tutorialSteps[2].image));
  });
});
