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

  // Track initialized state of tutorial
  var initialized = false;

  var MSG_MIGRATE_CON = 'migrate';
  var TXT_MSG = 'migrate';

  function notifyHomescreenApp() {
    navigator.mozApps.getSelf().onsuccess = function(evt) {
      var app = evt.target.result;
      if (app.connect) {
        app.connect(MSG_MIGRATE_CON).then(function onConnAccepted(ports) {
          // Get the token data info to attach to message
          var message = {
            txt: TXT_MSG
          };
          ports.forEach(function(port) {
            port.postMessage(message);
          });
        }, function onConnRejected(reason) {
          console.error('Cannot notify homescreen: ', reason);
        });
      } else {
        console.error('mozApps does not have a connect method. ' +
                      'Cannot launch the collection migration process');
      }
    };
  }

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

  function _loadMedia(mediaElement, src) {
    var isVideo = (mediaElement.nodeName === 'VIDEO');
    return new Promise(function(resolve, reject) {
      function onMediaLoadOrError(evt) {
        evt.target.removeEventListener('error', onMediaLoadOrError);
        if (isVideo) {
          evt.target.removeEventListener('canplay', onMediaLoadOrError);
        } else {
          evt.target.removeEventListener('load', onMediaLoadOrError);
        }
        // Dont block progress on failure to load media
        if (evt.type === 'error') {
          console.log('Failed to load tutorial media: ' + src);
        }
        resolve(evt);
      }
      function onVideoUnloaded(evt) {
        mediaElement.removeEventListener('emptied', onVideoUnloaded);
        mediaElement.removeEventListener('abort', onVideoUnloaded);
        mediaElement.addEventListener('canplay', onMediaLoadOrError);
        mediaElement.src = src;
        mediaElement.load();
      }
      if (isVideo) {
        // must unload video and force load before switching to new source
        mediaElement.addEventListener('error', onMediaLoadOrError);
        if (mediaElement.src) {
          mediaElement.addEventListener('emptied', onVideoUnloaded, false);
          mediaElement.addEventListener('abort', onVideoUnloaded, false);
          mediaElement.removeAttribute('src');
          mediaElement.load();
        } else {
          onVideoUnloaded();
        }
      } else {
        mediaElement.addEventListener('load', onMediaLoadOrError, false);
        mediaElement.addEventListener('error', onMediaLoadOrError, false);
        mediaElement.src = src;
      }
    });
  }

  var elementIDs = [
    'tutorial',
    'tutorial-step-title',
    'tutorial-step-media',
    'tutorial-step-image',
    'tutorial-step-video',
    'forward-tutorial',
    'back-tutorial',
    'tutorial-progress',
    'tutorial-progress-bar'
  ];

  var Tutorial = {
    // A configuration object.
    config: null,

    init: function(stepsKey, onLoaded) {
      // init is async
      // need to load config, then load the first step and its assets.

      if (initialized || this._initialization) {
        // init already underway
        return;
      }

      var initTasks = this._initialization = new Sequence(
        // config should load or already be loaded.
        // failure should abort
        this.ensureConfig.bind(this),
        this._initWithConfig.bind(this, stepsKey),
        // setStep should return promise given by _loadMedia
        function setInitialStep() {
          return this._setStep();
        }.bind(this),
        function showTutorialAndFinishInit() {
          // Show the panel
          dom.tutorial.classList.add('show');
          // Custom event that can be used to apply (screen reader) visibility
          // changes.
          window.dispatchEvent(new CustomEvent('tutorialinitialized'));
        }
      );
      initTasks.onabort = function() {
        Tutorial._initialization = null;
      };
      initTasks.oncomplete = function(result) {
        Tutorial._initialization = null;
        if(typeof onLoaded === 'function') {
          onLoaded();
        }
      };

      initTasks.nom = '[initTasks]';

      // first time here: cache DOM elements
      elementIDs.forEach(function(name) {
        dom[Utils.camelCase(name)] = document.getElementById(name);
        if (!dom[Utils.camelCase(name)]) {
          console.log('Cache DOM elements: couldnt cache: ' + name);
        }
      }, this);

      // homescreen notification is out of band and neednt block
      // the other init steps
      notifyHomescreenApp();

      initTasks.next();
    },

    _initWithConfig: function(stepsKey) {
      stepsKey = stepsKey || 'default';
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
    },

    _setStep: function (value) {
      // If value is bigger than the max, show finish screen
      value = (typeof value === 'number') ? value : currentStep;
      var stepIndex = value - 1;
      if (stepIndex >= stepsConfig.steps.length) {
        return Promise.resolve().then(function() {
          Tutorial.done();
        });
      }

      var stepData = stepsConfig.steps[stepIndex];
      if (!stepData) {
        return Promise.reject('No data for step: ' + value);
      }
      // Set the step
      dom.tutorial.dataset.step = currentStep;

      // Internationalize
      navigator.mozL10n.localize(
        dom.tutorialStepTitle,
        stepData.l10nKey
      );

      // Update the image/video
      var imgElement = dom.tutorialStepImage,
          videoElement = dom.tutorialStepVideo;

      var stepPromise;
      if (stepData.video) {
        stepPromise = _loadMedia(videoElement, stepData.video).then(function(){
          videoElement.play();
        });
        videoElement.hidden = false;
        imgElement.hidden = true;
      } else {
        imgElement.hidden = false;
        stepPromise = _loadMedia(imgElement, stepData.image);
        imgElement.hidden = false;
        videoElement.hidden = true;
      }
      _setProgressBarStep(currentStep);
      return stepPromise;
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
      return this._setStep(++currentStep);
    },
    back: function() {
      return this._setStep(--currentStep);
    },
    done: function() {
      FinishScreen.init();
      dom.tutorial.classList.remove('show');
      dom.tutorialStepVideo.removeAttribute('src');
      dom.tutorialStepImage.removeAttribute('src');
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

        currentLayout = ScreenLayout.getCurrentLayout() === 'tiny' ?
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
      if (this._initialization) {
        this._initialization.abort();
        this._initialization = null;
      }
      if (this._configRequest) {
        this._configRequest.abort();
      }
      this._configPromise = null;
      currentStep = 1;
      stepsConfig = this.config = null;
      if (initialized) {
        _setProgressBarStep(currentStep);
        dom.tutorial.classList.remove('show');
      }
    }
  };

  // Flow control for a series of steps that may return promises
  function Sequence() {
    var sequence = Array.slice(arguments);
    var aborted = false;
    sequence.abort = function() {
      aborted = true;
      this.length = 0;
      if (typeof this.onabort === 'function') {
        this.onabort();
      }
    };
    sequence.complete = function(result) {
      if(!aborted && typeof this.oncomplete === 'function') {
        this.oncomplete(result);
      }
    };
    sequence.fail = function(reason) {
      this.complete(reason);
    };
    sequence.next = function(previousTaskResult) {
      var result, exception;
      if (aborted) {
        return;
      }
      var task = this.shift();
      if (task) {
        try {
          result = task.apply(null, arguments);
        } catch(e) {
          exception = e;
        }
        if (exception) {
          this.fail(exception);
        } else if (result && typeof result.then === 'function') {
          result.then(this.next.bind(this), this.fail.bind(this));
        } else {
          this.next(result);
        }
      } else {
        this.complete(previousTaskResult);
      }
    };
    return sequence;
  }

  exports.Tutorial = Tutorial;

})(this);
