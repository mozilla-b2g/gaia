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

  TutorialSteps.initial.tiny.stepsCount = 6 + 1;
  TutorialSteps.initial.large.stepsCount = 4 + 1;

  var supportLayout, stepIndex, imagePathSuffix, l10nKeySuffix;

  for (supportLayout in TutorialSteps.initial) {
    for (stepIndex = 1; stepIndex <
            TutorialSteps.initial[supportLayout].stepsCount; stepIndex++) {

      // NOTE: There is no suffix for imagePath in tiny layout
      imagePathSuffix = (supportLayout === 'tiny') ?
          '.png' : '_' + supportLayout + '.png';

      // Because we may change wordings on FTU, we need a specific suffix
      // used to concate distinct l10n id in different layout.
      //
      // NOTE: If you change any related wordings in properties file, remember
      // to change the suffix here
      l10nKeySuffix = (supportLayout === 'tiny') ? '' : '-2';

      TutorialSteps.initial[supportLayout][stepIndex] = {
        hash: '#step' + stepIndex,
        key: 'tutorial-step' + stepIndex + '-' + supportLayout + l10nKeySuffix,
        image: 'css/images/tutorial/' + stepIndex + imagePathSuffix
      };
      // Add setting key to the last tutorial step
      // You can add a 'setting' key to add a condition to the step
      if (stepIndex === TutorialSteps.initial[supportLayout].stepsCount - 1) {
        TutorialSteps.initial[supportLayout][stepIndex]['setting'] =
          'edgesgesture.enabled';
      }
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

  for (supportLayout in TutorialSteps[stepsKey]) {
    for (stepIndex = 1; stepIndex <
            TutorialSteps[stepsKey][supportLayout].stepsCount; stepIndex++) {

      // NOTE: There is no suffix for imagePath in tiny layout
      imagePathSuffix = (supportLayout === 'tiny') ?
          '.png' : '_' + supportLayout + '.png';

      l10nKeySuffix = (supportLayout === 'tiny') ? '' : '-2';

      TutorialSteps[stepsKey][supportLayout][stepIndex] = {
        hash: '#step' + stepIndex,
        key: 'tutorial-' + stepsKey.replace(/\./g, '') + '-step' + stepIndex +
          '-' + supportLayout + l10nKeySuffix,
        image: 'css/images/tutorial-' + stepsKey + '/' + stepIndex +
          imagePathSuffix
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
})(window);
