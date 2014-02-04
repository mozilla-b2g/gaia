'use strict';

(function(window) {

  /*
   * Steps of the First Time Usage App
   *
   * It will create objects like this :
   *
   * TutorialSteps.tiny = {
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
   * TutorialSteps.small = {
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
   * use TutorialSteps.get() to get steps
   */

  var TutorialSteps = {};

  TutorialSteps.tiny = {};
  TutorialSteps.large = {};

  TutorialSteps.tiny.stepsCount = 5 + 1;
  TutorialSteps.large.stepsCount = 4 + 1;

  for (var supportLayout in TutorialSteps) {
    for (var stepIndex = 1; stepIndex <
            TutorialSteps[supportLayout].stepsCount; stepIndex++) {

      // NOTE: There is no suffix for imagePath in tiny layout
      var imagePathSuffix = (supportLayout === 'tiny') ?
          '.png' : '_' + supportLayout + '.png';

      // Because we may change wordings on FTU, we need a specific suffix
      // used to concate distinct l10n id in different layout.
      //
      // NOTE: If you change any related wordings in properties file, remember
      // to change the suffix here
      var l10nKeySuffix = (supportLayout === 'tiny') ? '' : '-2';

      TutorialSteps[supportLayout][stepIndex] = {
        hash: '#step' + stepIndex,
        key: 'tutorial-step' + stepIndex + '-' + supportLayout + l10nKeySuffix,
        image: 'css/images/tutorial/' + stepIndex + imagePathSuffix
      };
    }
    delete TutorialSteps[supportLayout].stepsCount;
  }

  TutorialSteps.get = function() {
    var layout = (ScreenLayout && ScreenLayout.getCurrentLayout) ?
        ScreenLayout.getCurrentLayout() : 'tiny';

    if (layout in this) {
      return this[layout];
    }
    return null;
  };

  window.TutorialSteps = TutorialSteps;
})(this);
