/* global Promise,
          Utils, TutorialUtils */
/* exported Tutorial */

(function(exports) {
  'use strict';

  // Most used DOM elements
  var dom = {};

  /**
   * Manages and controls the configuration, content and state of the tutorial
   * @module Tutorial
   */
  var elementIDs = [
    'tutorial',
    'tutorial-step-title',
    'tutorial-step-media',
    'tutorial-step-image',
    'tutorial-step-video',
    'tutorial-finish',
    'tutorial-finished-btn',
    'forward-tutorial',
    'back-tutorial',
    'enjoyYourPhone',
    'enjoyYourPhoneUpdated'
  ];

  function Tutorial() {
    this.config = null;
    this._stepsConfig = null;
  }
  Tutorial.prototype = {
    // A configuration object.
    config: null,

    currentLayout: 'tiny',

    // Config for the current tutorial steps
    _stepsConfig: {},

    // Which tutorial steps to use
    _stepsKey: '',

    // Keeps track of the current step
    _currentStep: 1,

    // Track initialized state of tutorial
    _initialized: false,

    /**
     * Initialize the tutorial
     * @param {String} stepsKey a key into the tutorial config object, i
     *                          i.e. a version or version delta like 1.3..2.0
     * @memberof Tutorial
    */
    init: function(launchContext, config) {
      if (this._initialized) {
        // init already underway
        return;
      }
      this.launchContext = launchContext || {};
      console.log('init, got config: ', config);
      console.log('init, got launchContext: ', JSON.stringify(launchContext));
      this.config = config;
      var stepsKey = this.launchContext.stepsKey;
      if (!stepsKey) {
        // try to build a config key from previous/current upgrade params
        // trim back to major.minor
        var upgradeFrom = (this.launchContext.upgradeFrom || '')
                          .replace(/(\d+\.\d+).*/, '$1');
        var upgradeTo = (this.launchContext.upgradeTo || '')
                          .replace(/(\d+\.\d+).*/, '$1');
        if (upgradeFrom && upgradeTo) {
          stepsKey = upgradeFrom + '..' + upgradeTo;
          console.log('build stepsKey: ' + stepsKey);
        }
      }
      this._stepsKey = stepsKey || 'default';
      this._stepsConfig = this.config[this._stepsKey] || this.config['default'];

      // Set the first step
      this._currentStep = 1;

      // first time here: cache DOM elements
      elementIDs.forEach(function(name) {
        dom[Utils.camelCase(name)] = document.getElementById(name);
        if (!dom[Utils.camelCase(name)]) {
          console.error('Cache DOM elements: couldnt cache: ' + name);
        }
      }, this);

      // Add event listeners
      dom.forwardTutorial.addEventListener('click', this);
      dom.backTutorial.addEventListener('click', this);

      // watch a ton of video events as context for the tutorial
      // media loading/playing
      var mediaEvents = this._mediaEvents = ['abort',
                         'canplay',
                         'canplaythrough',
                         'durationchange',
                         'emptied',
                         'ended',
                         'error',
                         'interruptbegin',
                         'interruptend',
                         'loadeddata',
                         'loadedmetadata',
                         'loadstart',
                         'mozaudioavailable',
                         'pause',
                         'play',
                         'playing',
                         'stalled',
                         'suspend',
                         'waiting'];

      this._debugEventHandler = {
        handleEvent: function(evt) {
          var errCodes = {
            '1': 'MEDIA_ERR_ABORTED',
            '2': 'MEDIA_ERR_NETWORK',
            '3': 'MEDIA_ERR_DECODE',
            '4': 'MEDIA_ERR_SRC_NOT_SUPPORTED'
          };
          console.log('TUTORIAL: media-event: '+ evt.type);
          if (evt.type == 'error') {
            var errtype = errCodes[evt.target.error.code] || 'unknown';
            console.log('TUTORIAL: media-event, ' + errtype + ' error');
          }
        }
      };
      mediaEvents.forEach(name => {
        if (0) {
          dom.tutorialStepVideo.addEventListener(name, this._debugEventHandler);
        }
      });
    },

    /**
     * Show the tutorial and play the first step
     * We defer rasing the 'tutorialinitialized' event until this point
     * as it signals the tutorial step content is loaded and displayed
     *
     * @param {Function} onReady  optional callback for when start is complete
     * @memberof Tutorial
     */
    start: function(onReady) {
      this._setStep();

      // Show the panel
      dom.tutorial.classList.add('show');
      // Custom event that can be used to apply (screen reader) visibility
      // changes.
      console.log('TUTORIAL: dispatching tutorialinitialized');
      window.dispatchEvent(new CustomEvent('tutorialinitialized'));
    },

    /**
     * Advance the tutorial to the given step (first step if no value given)
     *
     * @param {Number} value number of the step to show (1-based)
     * @memberof Tutorial
     */
    _setStep: function (value) {
      // If value is bigger than the max, show finish screen
      value = (typeof value === 'number') ? value : this._currentStep;
      var stepIndex = value - 1;
      if (stepIndex >= this._stepsConfig.steps.length) {
        return Promise.resolve().then(() => {
          console.log('Tutorial done');
          this.done();
        });
      }

      var stepData = this._stepsConfig.steps[stepIndex];
      if (!stepData) {
        return Promise.reject('No data for step: ' + value);
      }
      // Set the step
      dom.tutorial.dataset.step = this._currentStep;

      // Internationalize
      document.l10n.setAttributes(
        dom.tutorialStepTitle,
        stepData.l10nKey
      );

      // Update the image/video
      var imgElement = dom.tutorialStepImage,
          videoElement = dom.tutorialStepVideo;

      var stepPromise;
      if (stepData.video) {
        stepPromise = TutorialUtils.getBestAssetForDirection(stepData.video)
        .then((bestSrc) => {
          return TutorialUtils.loadAndPlayMedia(videoElement, bestSrc);
        });
        videoElement.hidden = false;
        imgElement.hidden = true;
      } else {
        imgElement.hidden = false;
        stepPromise = TutorialUtils.loadMedia(imgElement, stepData.image);
        imgElement.hidden = false;
        videoElement.hidden = true;
      }
      return stepPromise;
    },

    /**
     * DOM Event handler
     *
     * @param {DOMEvent} evt Event object
     * @memberof Tutorial
     */
    handleEvent: function(evt) {
      if (evt.type === 'click') {
        switch(evt.target) {
          case dom.forwardTutorial:
            this.goNext(evt);
            break;
          case dom.backTutorial:
            this.goBack(evt);
            break;
        }
      }
    },

    /**
     * Advance to the next step in the tutorial
     * @memberof Tutorial
     */
    goNext: function() {
      console.log('next, step is this._currentStep', this._currentStep);
      return this._setStep(++this._currentStep);
    },

    /**
     * Go back to the previous step in the tutorial
     * @memberof Tutorial
     */
    goBack: function() {
      console.log('back, step is this._currentStep', this._currentStep);
      return this._setStep(--this._currentStep);
    },

    /**
     * Tutorial complete
     * @memberof Tutorial
     */
    done: function() {
      this.showFinish();
      dom.tutorial.classList.remove('show');
      dom.tutorialStepVideo.removeAttribute('src');
    },

    showFinish: function() {
      var isUpgrade = this._stepsKey && this._stepsKey !== 'default';
      dom.tutorialFinish.classList.add('show');

      if (isUpgrade) {
        dom.enjoyYourPhone.hidden = true;
        dom.enjoyYourPhoneUpdated.hidden = false;
      }

      dom.tutorialFinishedBtn.addEventListener('click', function tourEnd() {
        window.close();
      });
    },

    /**
     * Test helper to reset the tutorial to its pre-initialized state
     * to allow init to be called again
     * @memberof Tutorial
     */
    reset: function() {
      var resetPromise = Promise.resolve();
      if (dom.tutorialStepVideo) {
        this._mediaEvents.forEach(name => {
          dom.tutorialStepVideo.removeEventListener(
            name,
            this._debugEventHandler
          );
        });
        dom.tutorialStepVideo.hidden = true;
        if (dom.tutorialStepVideo.src) {
          resetPromise = new Promise((resolve, reject) => {
            dom.tutorialStepVideo.addEventListener('emptied', () => {
              resolve();
            });
            dom.tutorialStepVideo.removeAttribute('src');
            dom.tutorialStepVideo.load();
          });
        }
      }
      if (this._initialization) {
        this._initialization.abort();
        this._initialization = null;
      }
      this._currentStep = 1;
      this._stepsConfig = this.config = null;
      if (this._initialized) {
        dom.tutorial.classList.remove('show');
        this._initialized = false;
      }
      document.getElementById('tutorial').classList.remove('show');
      return resetPromise;
    }
  };

  exports.Tutorial = Tutorial;

})(this);
