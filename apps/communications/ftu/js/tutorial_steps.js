'use strict';

(function(window) {

  /*
   * Steps of the First Time Usage App
   *
   * It will create objects like this :
   *
   * TutorialSteps.initial.tiny = {
   *   1: {
   *     hash: '#step1',
   *     key: 'tutorial-step1-tiny',
   *     image: 'css/images/tutorial/1.png'
   *   },
   *   2: {
   *     hash: '#step2',
   *     key: 'tutorial-step2-tiny',
   *     image: 'css/images/tutorial/2.png'
   *   }
   * };
   *
   * TutorialSteps.initial.small = {
   *   1: {
   *     hash: '#step1',
   *     key: 'tutorial-step1-small',
   *     image: 'css/images/tutorial/1_small.png'
   *   },
   *   2: {
   *     hash: '#step2',
   *     key: 'tutorial-step2-small',
   *     image: 'css/images/tutorial/2_small.png'
   *   }
   * };
   *
   * use TutorialSteps.get() to get initial steps
   *
   */

  var TutorialSteps = {};

  TutorialSteps.initial = {};
  TutorialSteps.initial.tiny = {};
  TutorialSteps.initial.large = {};

  TutorialSteps.initial.tiny.stepsCount = 5 + 1;
  TutorialSteps.initial.large.stepsCount = 5 + 1;

  for (var supportLayout in TutorialSteps.initial) {
    for (var stepIndex = 1; stepIndex <
            TutorialSteps.initial[supportLayout].stepsCount; stepIndex++) {

      // NOTE: There is no suffix for imagePath in tiny layout
      var imagePathSuffix = (supportLayout === 'tiny') ?
          '.png' : '_' + supportLayout + '.png';

      TutorialSteps.initial[supportLayout][stepIndex] = {
        hash: '#step' + stepIndex,
        key: 'tutorial-step' + stepIndex + '-' + supportLayout,
        image: 'css/images/tutorial/' + stepIndex + imagePathSuffix
      };
    }
    delete TutorialSteps.initial[supportLayout].stepsCount;
  }

  // Define FTU steps for update from 1.3.0.0-prerelease to 1.4.0.0-prerelease
  var stepsKey = '1.3.0.0-prerelease..1.4.0.0-prerelease';
  TutorialSteps[stepsKey] = {};
  TutorialSteps[stepsKey].tiny = {};
  TutorialSteps[stepsKey].large = {};
  TutorialSteps[stepsKey].tiny.stepsCount = 3 + 1;
  TutorialSteps[stepsKey].large.stepsCount = 3 + 1;

  for (var supportLayout in TutorialSteps[stepsKey]) {
    for (var stepIndex = 1; stepIndex <
            TutorialSteps[stepsKey][supportLayout].stepsCount; stepIndex++) {

      // NOTE: There is no suffix for imagePath in tiny layout
      var imagePathSuffix = (supportLayout === 'tiny') ?
          '.png' : '_' + supportLayout + '.png';

      TutorialSteps[stepsKey][supportLayout][stepIndex] = {
        hash: '#step' + stepIndex,
        key: 'tutorial-' + stepsKey.replace(/\./g, '') + '-step' + stepIndex + '-' + supportLayout,
        image: 'css/images/tutorial-' + stepsKey + '/' + stepIndex + imagePathSuffix
      };
    }
    delete TutorialSteps[stepsKey][supportLayout].stepsCount;
  }


  TutorialSteps.get = function(stepsKey) {
    var layout = (ScreenLayout && ScreenLayout.getCurrentLayout) ?
        ScreenLayout.getCurrentLayout() : 'tiny';

    var context = this[stepsKey || 'initial'];
    if (layout in context) {
      return context[layout];
    }
    return null;
  };

  window.TutorialSteps = TutorialSteps;
})(this);
