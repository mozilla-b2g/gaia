/* global ScreenLayout,
          Utils, FinishScreen */
/* exported Tutorial */

(function(exports) {

  'use strict';
  // Keeps track of the current step
  var currentStep = 1;
  // Keeps in memory the max. length taking into account the layout
  var stepsLength = {
    tiny: 0,
    large: 0
  };
  // Defaut layout is 'tiny', the one for mobile device
  var currentLayout = 'tiny';
  // Most used DOM elements
  var dom = {};
  // Suffix for the styles, taking into account the layout.
  var l10nSuffix, imgSuffix;

  function _initProgressBar() {
    dom.tutorialProgressBar.style.width =
      'calc(100% / ' + stepsLength[currentLayout] + ')';
  }

  function _setProgressBarStep(step) {
    dom.tutorialProgressBar.style.transform =
        'translate(' + ((step - 1) * 100) + '%)';
  }

  function _setStep(value) {
    // If value is bigger than the max, show finish screen
    if (value > +stepsLength[currentLayout]) {
      Tutorial.done();
      return;
    }
    // Set the step
    dom.tutorial.dataset.step = currentStep;

    // Internationalize
    navigator.mozL10n.localize(
      dom.tutorialStepTitle,
      'tutorial-step' + currentStep + l10nSuffix
    );

    // Update the image
    dom.tutorialStepImage.querySelector('img').src =
      'style/images/tutorial/' + currentStep + imgSuffix + '.png';

    _setProgressBarStep(currentStep);
  }

  var elementIDs = [
    'tutorial',
    'tutorial-step-title',
    'tutorial-step-image',
    'forward-tutorial',
    'back-tutorial',
    'tutorial-progress-bar'
  ];

  var initialized = false;
  var Tutorial = {
    init: function() {
      if (initialized) {
        return;
      }
      // Update the value of the layout if needed
      // 'ScreenLayout' give us 4 different values
      // tiny: '(max-width: 767px)',
      // small: '(min-width: 768px) and (max-width: 991px)',
      // medium: '(min-width: 992px) and (max-width: 1200px)',
      // large: '(min-width: 1201px)',
      //
      // Currently we are taking into account only 'tiny', and we are
      // going to consider 'tablet' as 'large'. If we want to add more
      // or specific features for 'small' & 'medium', we should add more
      // logic here.

      if (ScreenLayout.getCurrentLayout() !== 'tiny') {
        currentLayout = 'large';
      }

      // Cache DOM elements
      elementIDs.forEach(function (name) {
        dom[Utils.camelCase(name)] = document.getElementById(name);
      }, this);

      // Cache max steps taking into account the layout
      stepsLength.tiny = dom.tutorial.dataset.maxstepsTiny;
      stepsLength.large = dom.tutorial.dataset.maxstepsLarge;

      // Add event listeners
      dom.forwardTutorial.addEventListener(
        'click',
        this.next.bind(this)
      );
      dom.backTutorial.addEventListener(
        'click',
        this.back.bind(this)
      );
      // Set suffix according to the layout
      l10nSuffix = (currentLayout === 'tiny') ? '-tiny': '-large-2';
      imgSuffix = (currentLayout === 'tiny') ? '': '_large';

      // Avoid to reset this
      initialized = true;

      _initProgressBar();

      // Set the first step
      currentStep = 1;
      _setStep(currentStep);
      // Show the panel
      dom.tutorial.classList.add('show');
    },
    next: function() {
      _setStep(++currentStep);
    },
    back: function() {
      _setStep(--currentStep);
    },
    done: function() {
      FinishScreen.init();
      dom.tutorial.classList.remove('show');
    }
  };

  exports.Tutorial = Tutorial;

}(this));
