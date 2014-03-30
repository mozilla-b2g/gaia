/* global ScreenLayout */
/* jshint sub: true */
// Need to ignore the jshint dot notation errors in here.
// The array used for the different layouts is accesed by
// a changing variable, and it's more readable with bracket notation
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

  TutorialSteps.tiny.stepsCount = 6 + 1;
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
      // Add setting key to the last tutorial step
      // You can add a 'setting' key to add a condition to the step
      if (stepIndex === TutorialSteps[supportLayout].stepsCount - 1) {
        TutorialSteps[supportLayout][stepIndex]['setting'] =
          'edgesgesture.enabled';
      }
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
})(window);
