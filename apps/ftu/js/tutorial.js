/* global ScreenLayout, Promise,
          Utils, FinishScreen, LazyLoader, TutorialUtils */
/* exported Tutorial */

(function(exports) {
  'use strict';

  // default layout
  var currentLayout = 'tiny';

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
    'forward-tutorial',
    'back-tutorial'
  ];

  var Tutorial = {
    // A configuration object.
    config: null,

    // Config for the current tutorial steps
    _stepsConfig: {},

    // Which tutorial steps to use
    _stepsKey: '',

    // Keeps track of the current step
    _currentStep: 1,

    // Track initialized state of tutorial
    _initialized: false,

    /**
     * Initialize the tutorial. This is async as a config file must be loaded.
     * A Sequence (array of sync or async functions) is used to manage the init
     * tasks.
     * When complete, the tutorial is ready to be shown via the 'start' method
     *
     * @param {String} stepsKey a key into the tutorial config object, i
     *                          i.e. a version or version delta like 1.3..2.0
     * @param {Function} onLoaded  optional callback for when init is complete
     * @memberof Tutorial
    */
    init: function(stepsKey, onLoaded) {
      // init is async
      // need to load config, then load the first step and its assets.
      if (this._initialized || this._initialization) {
        // init already underway
        return;
      }

      var initTasks = this._initialization = new TutorialUtils.Sequence(
        // config should load or already be loaded.
        // failure should abort
        this.loadConfig.bind(this),
        this._initWithConfig.bind(this, stepsKey)
      );
      initTasks.onabort = this._onAbortInitialization.bind(this);
      initTasks.oncomplete =
        this._onCompleteInitialization.bind(this, onLoaded);

      // first time here: cache DOM elements
      elementIDs.forEach(function(name) {
        dom[Utils.camelCase(name)] = document.getElementById(name);
        if (!dom[Utils.camelCase(name)]) {
          console.error('Cache DOM elements: couldnt cache: ' + name);
        }
      }, this);

      initTasks.next();

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
        dom.tutorialStepVideo.addEventListener(name, this._debugEventHandler);
      });
    },

    /**
     * Show the tutorial and play the first step
     * May be called during or after the init process
     * We defer rasing the 'tutorialinitialized' event until this point
     * as it signals the tutorial step content is loaded and displayed
     *
     * @param {Function} onReady  optional callback for when start is complete
     * @memberof Tutorial
     */
    start: function(onReady) {
      var sequence;
      var initInProgress = false;
      if (this._initialization) {
        // init still underway, tack steps onto existing sequence
        sequence = this._initialization;
        initInProgress = true;
      } else {
        // init already complete, create new sequence
        this._initialization = sequence = new TutorialUtils.Sequence();
        sequence.onabort = this._onAbortInitialization.bind(this);
        sequence.oncomplete =
          this._onCompleteInitialization.bind(this);
      }
      sequence.push(function setInitialStep() {
        // setStep should return promise given by _loadMedia
        console.log('TUTORIAL: setInitialStep');
        return this._setStep();
      }.bind(this));

      sequence.push(function showTutorialAndFinishInit() {
        // Show the panel
        dom.tutorial.classList.add('show');
        // Custom event that can be used to apply (screen reader) visibility
        // changes.
        console.log('TUTORIAL: dispatching tutorialinitialized');
        window.dispatchEvent(new CustomEvent('tutorialinitialized'));
      });

      if(typeof onReady === 'function') {
        sequence.push(onReady);
      }

      if (!initInProgress) {
        // init done, starting start sequence
        sequence.next();
      }
    },

    /**
     * Continue initialization once config data is loaded
     * Called as a part of the init sequence
     *
     * @param {String} stepsKey a key into the tutorial config object, i
     *                          i.e. a version or version delta like 1.3..2.0
     * @memberof Tutorial
     */
    _initWithConfig: function(stepsKey) {
      stepsKey = stepsKey || 'default';
      this._stepsKey = stepsKey;
      this._stepsConfig = this.config[stepsKey] || this.config['default'];

      // Add event listeners
      dom.forwardTutorial.addEventListener('click', this);
      dom.backTutorial.addEventListener('click', this);

      // Set the first step
      this._currentStep = 1;
    },
    _onAbortInitialization: function() {
      this._initialization = null;
    },
    _onCompleteInitialization: function(onReady) {
      this._initialization = null;
      this._initialized = true;
      if(typeof onReady === 'function') {
        onReady();
      }
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
        return Promise.resolve().then(function() {
          Tutorial.done();
        });
      }

      var stepData = this._stepsConfig.steps[stepIndex];
      if (!stepData) {
        return Promise.reject('No data for step: ' + value);
      }
      // Set the step
      dom.tutorial.dataset.step = this._currentStep;

      // Internationalize
      navigator.mozL10n.setAttributes(
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
            this.next(evt);
            break;
          case dom.backTutorial:
            this.back(evt);
            break;
        }
      }
    },

    /**
     * Advance to the next step in the tutorial
     * @memberof Tutorial
     */
    next: function() {
      return this._setStep(++this._currentStep);
    },

    /**
     * Go back to the previous step in the tutorial
     * @memberof Tutorial
     */
    back: function() {
      return this._setStep(--this._currentStep);
    },

    /**
     * Tutorial complete
     * @memberof Tutorial
     */
    done: function() {
      var isUpgrade = this._stepsKey && this._stepsKey !== 'default';
      FinishScreen.init(isUpgrade);
      dom.tutorial.classList.remove('show');
      dom.tutorialStepVideo.removeAttribute('src');
      dom.tutorialStepImage.removeAttribute('src');
    },

    /**
     * Load the config with steps and associated resources for the tutorial
     * We have different config files for each screen category:
     * phone is 'tiny', tablet is 'large'
     * and corresponding tiny.json, large.json
     *
     * @returns {Promise}
     * @memberof Tutorial
     */
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

        currentLayout = ScreenLayout.getCurrentLayout() === 'tiny' ?
                              'tiny' : 'large';

        var configUrl = '/config/' + currentLayout + '.json';

        this._configPromise = LazyLoader.getJSON(configUrl)
                                        .then(function(json) {
          Tutorial.config = json;
          return Tutorial.config;
        }, function() {
          return new Error('Tutorial config failed to load from: ' + configUrl);
        });
      }
      return this._configPromise;
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
      this._configPromise = null;
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
