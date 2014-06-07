/* global ScreenLayout, Promise,
          Utils, FinishScreen */
/* exported Tutorial */

(function(exports) {
  'use strict';

  // Config for the current tutorial steps
  var stepsConfig = {};

  // default layout
  var currentLayout = 'tiny';

  // Keeps track of the current step
  var currentStep = 1;
  // Most used DOM elements
  var dom = {};

  function _initProgressBar() {
    dom.tutorialProgressBar.style.width =
      'calc(100% / ' + stepsConfig.steps.length + ')';
  }

  function _setProgressBarStep(step) {
    dom.tutorialProgressBar.style.transform =
      'translate(' + ((step - 1) * 100) + '%)';
    if (stepsConfig) {
      dom.tutorialProgress.setAttribute('aria-valuetext', navigator.mozL10n.get(
        'progressbar', {
          step: step,
          total: stepsConfig.steps.length
        }));
      dom.tutorialProgress.setAttribute('aria-valuemin', 1);
      dom.tutorialProgress.setAttribute('aria-valuemax',
        stepsConfig.steps.length);
    } else {
      dom.tutorialProgress.removeAttribute('aria-valuetext');
      dom.tutorialProgress.removeAttribute('aria-valuemin');
      dom.tutorialProgress.removeAttribute('aria-valuemax');
    }
  }

  function _setStep(value, callback) {
    // If value is bigger than the max, show finish screen
    var stepIndex = value - 1;
    if (stepIndex >= stepsConfig.steps.length) {
      Tutorial.done();
      return;
    }
    var stepData = stepsConfig.steps[stepIndex];
    // Set the step
    dom.tutorial.dataset.step = currentStep;

    // Internationalize
    navigator.mozL10n.localize(
      dom.tutorialStepTitle,
      stepData.l10nKey
    );

    // Update the image/video
    var imgElement = dom.tutorialStepMedia.querySelector('img'),
        videoElement = dom.tutorialStepMedia.querySelector('video');

    function onVideoLoadOrError(evt) {
      videoElement.removeEventListener('loadeddata', onVideoLoadOrError);
      videoElement.removeEventListener('error', onVideoLoadOrError);
      callback(evt);
    }

    if (stepData.video) {
      if (typeof callback === 'function') {
        videoElement.addEventListener('loadeddata', onVideoLoadOrError, false);
        videoElement.addEventListener('error', onVideoLoadOrError, false);
      }
      videoElement.src = stepData.video;
      videoElement.hidden = false;
      imgElement.hidden = true;
    } else {
      if (typeof callback === 'function') {
        imgElement.onload = imgElement.onerror = callback;
      }
      imgElement.hidden = false;
      imgElement.src = stepData.image;
      videoElement.hidden = true;
    }
    _setProgressBarStep(currentStep);
  }

  var elementIDs = [
    'tutorial',
    'tutorial-step-title',
    'tutorial-step-media',
    'forward-tutorial',
    'back-tutorial',
    'tutorial-progress',
    'tutorial-progress-bar'
  ];

  var initialized = false;
  var Tutorial = {
    // A configuration object.
    config: null,

    init: function(stepsKey, onLoaded) {
      if (initialized) {
        if (typeof onLoaded == 'function') {
          this._configPromise.then(onLoaded);
        }
        return;
      }
      // Cache DOM elements
      elementIDs.forEach(function(name) {
        dom[Utils.camelCase(name)] = document.getElementById(name);
      }, this);

      // Init in progress
      initialized = true;

      this.ensureConfig().then(function initWithConfig() {
        if (!stepsKey) {
          stepsKey = 'default';
        }
        stepsConfig = this.config[stepsKey] || this.config['default'];
        // Add event listeners
        dom.forwardTutorial.addEventListener('click', this);
        dom.backTutorial.addEventListener('click', this);

        // toggle the layout based number of steps and whether we'll show the
        // progress bar or not
        if (stepsConfig.steps.length > 3) {
          dom.tutorial.dataset.progressbar = true;
          _initProgressBar();
        } else {
          delete dom.tutorial.dataset.progressbar;
        }

        // Set the first step
        currentStep = 1;
        _setStep(currentStep, function onFirstResourceLoaded() {
          if (typeof onLoaded === 'function') {
            onLoaded();
          }
          // Show the panel
          dom.tutorial.classList.add('show');
        });

        // Custom event that can be used to apply (screen reader) visibility
        // changes.
        window.dispatchEvent(new CustomEvent('tutorialinitialized'));
      }.bind(this), function() {
        console.log('Tutorial.init: config not loaded');
      });
    },
    handleEvent: function(evt) {
      if (evt.type === 'click') {
        switch(evt.target) {
          case dom.forwardTutorial:
            this.next(evt);
            break;
          case dom.backTutorial:
            this.back(evt);
            break;
        }
      }
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
    },
    loadConfig: function() {
      if (!this._configPromise) {
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

        currentLayout = ScreenLayout.getCurrentLayout() == 'tiny' ?
                              'tiny' : 'large';

        var configUrl = '/config/' + currentLayout + '.json';

        this._configPromise = new Promise(function(resolve, reject) {
          var xhr = Tutorial._configRequest = new XMLHttpRequest();
          xhr.open('GET', configUrl, true);
          xhr.responseType = 'json';

          xhr.onload = function() {
            Tutorial._configRequest = null;
            if (xhr.response) {
              Tutorial.config = xhr.response;
              resolve(Tutorial.config);
            } else {
              reject(
                new Error('Tutorial config failed to load from: ' + configUrl)
              );
            }
          };

          xhr.onerror = function(err) {
            Tutorial._configRequest = null;
            reject(
              new Error('Tutorial config failed to load from: ' + configUrl)
            );
          };
          xhr.send(null);
        });
      }
      return this._configPromise;
    },
    ensureConfig: function() {
      return this.loadConfig();
    },
    reset: function() {
      if (this._configRequest) {
        this._configRequest.abort();
      }
      this._configPromise = null;
      if (!initialized) {
        return;
      }
      currentStep = 0;
      stepsConfig = Tutorial.config = null;
      initialized = false;
      _setProgressBarStep(currentStep);
      dom.tutorial.classList.remove('show');
    }
  };

  exports.Tutorial = Tutorial;

}(this));
