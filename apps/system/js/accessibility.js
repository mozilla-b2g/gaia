'use strict';
/* global SettingsListener, LazyLoader, Service */
/* global AccessibilityQuicknavMenu */

(function(exports) {

  /**
   * Accessibility enables and disables the screenreader after the user
   * gestures using the hardware buttons of the phone. To toggle the setting.
   * the user must press volume up, then volume down three times in a row.
   * @class Accessibility
   * @requires SettingsListener
   */
  function Accessibility() {}

  Accessibility.prototype = {

    /**
     * How fast the autorepeat is.
     * @type {Number}
     * @memberof Accessibility.prototype
     */
    REPEAT_INTERVAL: 600000,

    /**
     * Maximum interval between initial and final TOGGLE_SCREEN_READER_COUNT
     * volume button presses.
     * @type {Number}
     * @memberof Accessibility.prototype
     */
    REPEAT_BUTTON_PRESS: 15000000,

    /**
     * Number of times the buttons need to be pressed before the screen reader
     * setting is toggled.
     * @type {Number}
     * @memberof Accessibility.prototype
     */
    TOGGLE_SCREEN_READER_COUNT: 6,

    /**
     * Cap the full range of contrast. Actual -1 is completely gray, and 1
     * makes things hard to see. This value is the max/min contrast.
     */
    CONTRAST_CAP: 0.6,

    /**
     * Timeout (in milliseconds) between when a vc-change event fires
     * and when interaction hints (if any) are spoken
     */
    HINTS_TIMEOUT: 2000,

    /**
     * Current counter for button presses in short succession.
     * @type {Number}
     * @memberof Accessibility.prototype
     */
    counter: 0,

    /**
     * Next expected event.
     * @type {Object}
     * @memberof Accessibility.prototype
     */
    expectedEvent: {
      type: 'volumeup',
      timeStamp: 0
    },

    /**
     * Expected complete time stamp.
     * @type {Number}
     * @memberof Accessibility.prototype
     */
    expectedCompleteTimeStamp: 0,

    /**
     * Accessibility settings to be observed.
     * @type {Object} name: value pairs.
     * @memberof Accessibility.prototype
     */
    settings: {
      'accessibility.screenreader': false,
      'accessibility.screenreader-volume': 1,
      'accessibility.screenreader-rate': 0,
      'accessibility.screenreader-captions': false,
      'accessibility.screenreader-shade': false,
      'accessibility.colors.enable': false,
      'accessibility.colors.invert': false,
      'accessibility.colors.grayscale': false,
      'accessibility.colors.contrast': '0.0'
    },

    /**
     * Audio used by the screen reader.
     * Note: Lazy-loaded when first needed
     * @type {Object}
     * @memberof Accessibility.prototype
     */
    sounds: {
      clickedAudio: null,
      vcKeyAudio: null,
      vcMoveAudio: null,
      noMoveAudio: null
    },

    /**
     * URLs for screen reader audio files.
     * @type {Object}
     * @memberof Accessibility.prototype
     */
    soundURLs: {
      clickedAudio: './resources/sounds/screen_reader_clicked.ogg',
      vcKeyAudio: './resources/sounds/screen_reader_virtual_cursor_key.ogg',
      vcMoveAudio: './resources/sounds/screen_reader_virtual_cursor_move.ogg',
      noMoveAudio: './resources/sounds/screen_reader_no_move.ogg'
    },

    /**
     * Start listening for events.
     * @memberof Accessibility.prototype
     */
    start: function ar_init() {

      this.screen = document.getElementById('screen');

      this.speechSynthesizer = speechSynthesizer;

      window.addEventListener('mozChromeEvent', this);
      window.addEventListener('volumeup', this);
      window.addEventListener('volumedown', this);
      window.addEventListener('logohidden', this);
      window.addEventListener('screenchange', this);

      // Attach all observers.
      Object.keys(this.settings).forEach(function attach(settingKey) {
        SettingsListener.observe(settingKey, this.settings[settingKey],
          function observe(aValue) {
            var oldValue = this.settings[settingKey];
            this.settings[settingKey] = aValue;
            switch (settingKey) {
              case 'accessibility.screenreader':
                // Show Accessibility panel if it is not already visible
                if (aValue) {
                  SettingsListener.getSettingsLock().set({
                    'accessibility.screenreader-show-settings': true
                  });
                }
                if (this.settings['accessibility.screenreader-shade']) {
                  this.toggleShade(aValue, !aValue);
                }
                this.screen.classList.toggle('screenreader', aValue);
                break;

              case 'accessibility.colors.enable':
                SettingsListener.getSettingsLock().set({
                  'layers.effect.invert': aValue ?
                    this.settings['accessibility.colors.invert'] : false,
                  'layers.effect.grayscale': aValue ?
                    this.settings['accessibility.colors.grayscale'] : false,
                  'layers.effect.contrast': aValue ?
                    this.settings['accessibility.colors.contrast'] *
                    this.CONTRAST_CAP : '0.0'
                });
                break;

              case 'accessibility.screenreader-captions':
                this.speechSynthesizer.captions = aValue;
                // If captions are displayed hide them.
                if (!aValue) {
                  this.speechSynthesizer.hideSpeech(true);
                }
                break;

              case 'accessibility.screenreader-shade':
                if (this.settings['accessibility.screenreader']) {
                  this.toggleShade(aValue, oldValue === aValue);
                }
                break;

              case 'accessibility.colors.invert':
              case 'accessibility.colors.grayscale':
              case 'accessibility.colors.contrast':
                if (this.settings['accessibility.colors.enable']) {
                  var effect = settingKey.split('.').pop();
                  var gfxSetting = {};
                  if (effect === 'contrast') {
                    gfxSetting['layers.effect.contrast'] =
                      aValue * this.CONTRAST_CAP;
                  } else {
                    gfxSetting['layers.effect.' + effect] = aValue;
                  }
                  SettingsListener.getSettingsLock().set(gfxSetting);
                }
                break;
            }
          }.bind(this));
      }, this);
    },

    /**
     * Reset the expected event to defaults.
     * @memberof Accessibility.prototype
     */
    reset: function ar_resetEvent() {
      this.expectedEvent = {
        type: 'volumeup',
        timeStamp: 0
      };
      this.counter = 0;
    },

    /**
     * Unset speaking flag and set the expected complete time stamp.
     * @param  {?Number} aExpectedCompleteTimeStamp Expected complete time
     * stamp.
     * @memberof Accessibility.prototype
     */
    resetSpeaking: function ar_resetSpeaking(aExpectedCompleteTimeStamp) {
      this.isSpeaking = false;
      this.expectedCompleteTimeStamp = aExpectedCompleteTimeStamp || 0;
    },

    toggleShade: function ar_toggleShage(aEnable, aSilent) {
      Service.request(aEnable ? 'turnShadeOn' : 'turnShadeOff');
      if (!aSilent) {
        this.speak({ string: aEnable ? 'shadeToggleOn' : 'shadeToggleOff' },
          null, {enqueue: true});
      }
    },

    /**
     * Handle volumeup and volumedown events generated from HardwareButtons.
     * @param  {Object} aEvent a high-level key event object generated from
     * HardwareButtons.
     * @memberof Accessibility.prototype
     */
    handleVolumeButtonPress: function ar_handleVolumeButtonPress(aEvent) {
      var type = aEvent.type;
      var timeStamp = aEvent.timeStamp;
      var expectedEvent = this.expectedEvent;
      if (type !== expectedEvent.type || timeStamp > expectedEvent.timeStamp) {
        this.reset();
        if (type !== 'volumeup') {
          return;
        }
      }

      this.expectedEvent = {
        type: type === 'volumeup' ? 'volumedown' :
          'volumeup',
        timeStamp: timeStamp + this.REPEAT_INTERVAL
      };

      if (++this.counter < this.TOGGLE_SCREEN_READER_COUNT) {
        return;
      }

      this.reset();

      if (!this.isSpeaking && timeStamp > this.expectedCompleteTimeStamp) {
        this.cancelSpeech();
        this.announceScreenReader(function onEnd() {
          this.resetSpeaking(timeStamp + this.REPEAT_BUTTON_PRESS);
        }.bind(this));
        return;
      }

      this.cancelSpeech();
      this.resetSpeaking();
      SettingsListener.getSettingsLock().set({
        'accessibility.screenreader':
          !this.settings['accessibility.screenreader']
      });
    },

    /**
     * Play audio for a screen reader notification.
     * @param  {String} aSoundKey a key for the screen reader audio.
     * XXX: When Bug 848954 lands we should be able to use Web Audio API.
     * @memberof Accessibility.prototype
     */
    _playSound: function ar__playSound(aSoundKey) {
      if (!this.sounds[aSoundKey]) {
        this.sounds[aSoundKey] = new Audio(this.soundURLs[aSoundKey]);
        this.sounds[aSoundKey].load();
      }
      var audio = this.sounds[aSoundKey].cloneNode(false);
      audio.volume = this.volume;
      audio.play();
    },

    /**
     * Get current screen reader volume defined by the setting.
     * @return {Number} Screen reader volume wihtin the [0, 1] interval.
     * @memberof Accessibility.prototype
     */
    get volume() {
      return this.settings['accessibility.screenreader-volume'];
    },

    /**
     * Get current screen reader speech rate defined by the setting.
     * @return {Number} Screen reader rate within the [0.2, 10] interval.
     * @memberof Accessibility.prototype
     */
    get rate() {
      var rate = this.settings['accessibility.screenreader-rate'];
      return rate >= 0 ? rate + 1 : 1 / (Math.abs(rate) + 1);
    },

    /**
     * Start a timeout that waits to display hints
     * @memberof Accessibility.prototype
     */
    setHintsTimeout: function ar_setHintsTimeout(aHints) {
      clearTimeout(this.hintsTimer);
      this.hintsTimer = setTimeout(function onHintsTimeout() {
        this.isSpeakingHints = true;
        this.speak(aHints, function onSpeakHintsEnd() {
          this.isSpeakingHints = false;
        }.bind(this), {
          enqueue: true
        });
      }.bind(this), this.HINTS_TIMEOUT);
    },

    /**
     * Handle accessfu mozChromeEvent.
     * @param  {Object} accessfu details object.
     * @memberof Accessibility.prototype
     */
    handleAccessFuOutput: function ar_handleAccessFuOutput(aDetails) {
      this.cancelHints();
      var options = aDetails.options || {};
      window.dispatchEvent(new CustomEvent('accessibility-action'));
      switch (aDetails.eventType) {
        case 'vc-change':
          // Vibrate when the virtual cursor changes.
          navigator.vibrate(options.pattern);
          this._playSound(options.isKey ? 'vcKeyAudio' : 'vcMoveAudio');
          break;
        case 'action':
          if (aDetails.data[0].string === 'clickAction') {
            // If element is clicked, play 'click' sound instead of speech.
            this._playSound('clickedAudio');
            return;
          }
          break;
        case 'no-move':
          this._playSound('noMoveAudio');
          return;
      }

      this.speak(aDetails.data, function hintsCallback() {
        if (options.hints) {
          this.setHintsTimeout(options.hints);
        }
      }.bind(this), {
        enqueue: options.enqueue
      });
    },

    handleAccessFuControl: function ar_handleAccessFuControls(aDetails) {
      this.cancelHints();
      switch (aDetails.eventType) {
        case 'quicknav-menu':
          if (!this.quicknav) {
            LazyLoader.load(['js/accessibility_quicknav_menu.js'])
              .then(() => {
                this.quicknav = new AccessibilityQuicknavMenu();
                this.quicknav.show();
              }).catch((err) => {
                console.error(err);
              });
          } else {
              this.quicknav.show();
          }
          break;
        case 'toggle-shade':
          SettingsListener.getSettingsLock().set({
            'accessibility.screenreader-shade':
            !this.settings['accessibility.screenreader-shade']
          });
          window.dispatchEvent(new CustomEvent('accessibility-action'));
          break;
        default:
          break;
      }
    },

    /**
     * Listen for screen change events and stop speaking if the
     * screen is disabled (in 'off' state)
     * @memberof Accessibility.prototype
     */
    handleScreenChange: function ar_handleScreenChange(aDetail){
      if(!aDetail.screenEnabled){
        this.cancelHints();
      }
    },

    /**
     * Remove aria-hidden from the screen element to make content accessible to
     * the screen reader.
     * @memberof Accessibility.prototype
     */
    activateScreen: function ar_activateScreen() {
      // Screen reader will not say anything until the splash animation is
      // hidden and the aria-hidden attribute is removed from #screen.
      this.screen.removeAttribute('aria-hidden');
      window.removeEventListener('logohidden', this);
    },

    /**
     * Handle event.
     * @param  {Object} aEvent mozChromeEvent/logohidden/volumeup/volumedown.
     * @memberof Accessibility.prototype
     */
    handleEvent: function ar_handleEvent(aEvent) {
      switch (aEvent.type) {
        case 'screenchange':
          this.handleScreenChange(aEvent.detail);
          break;
        case 'logohidden':
          this.activateScreen();
          break;
        case 'mozChromeEvent':
          switch (aEvent.detail.type) {
            case 'accessibility-output':
              this.handleAccessFuOutput(JSON.parse(aEvent.detail.details));
              break;
            case 'accessibility-control':
              this.handleAccessFuControl(JSON.parse(aEvent.detail.details));
              break;
          }
          break;
        case 'volumeup':
        case 'volumedown':
          this.handleVolumeButtonPress(aEvent);
          break;
      }
    },

    /**
     * Check for Hints speech/timer and clear.
     * @memberof Accessibility.prototype
     */
    cancelHints: function ar_cancelHints() {
      clearTimeout(this.hintsTimer);
      if(this.isSpeakingHints){
        this.cancelSpeech();
        this.isSpeakingHints = false;
      }
    },

    /**
     * Based on whether the screen reader is currently enabled, announce the
     * instructions of how to enable/disable it.
     * @param {Function} aCallback A callback after the speech synthesis is
     * completed.
     * @memberof Accessibility.prototype
     */
    announceScreenReader: function ar_announceScreenReader(aCallback) {
      var enabled = this.settings['accessibility.screenreader'];
      this.isSpeaking = true;
      this.speak({
        string: enabled ? 'disableScreenReaderSteps' : 'enableScreenReaderSteps'
      }, aCallback, {enqueue: false});
    },

    /**
     * Use speechSynthesis to speak screen reader utterances.
     * @param  {?Array} aData Speech data before it is localized.
     * @param  {?Function} aCallback aCallback A callback after the speech
     * synthesis is completed.
     * @param  {?Object} aOptions = {} Speech options such as enqueue etc.
     * @memberof Accessibility.prototype
     */
    speak: function ar_speak(aData, aCallback, aOptions = {}) {
      this.speechSynthesizer.speak(aData, aOptions, this.rate, this.volume,
        aCallback);
    },

    /**
     * Cancel any utterances currently being spoken by speechSynthesis.
     * @memberof Accessibility.prototype
     */
    cancelSpeech: function ar_cancelSpeech() {
      this.speechSynthesizer.cancel();
    }
  };

  /**
   * A speech synthesizer component that handles speech localization and
   * pronunciation.
   * @type {Object}
   */
  var speechSynthesizer = {

    /**
     * A delay before hiding screen reader caption.
     * @type {Number}
     * @memberof speechSynthesizer
     */
    CAPTIONS_DELAY: 1500,

    /**
     * A flag used for speech captions rendering.
     * @type {Boolean}
     * @memberof speechSynthesizer
     */
    captions: false,

    /**
     * Screen container getter.
     * @type {Object}
     * @memberof speechSynthesizer
     */
    get screen() {
      delete this.screen;
      this.screen = document.getElementById('screen');
      return this.screen;
    },

    /**
     * Speech Synthesis
     * @type {Object}
     * @memberof speechSynthesizer
     */
    get speech() {
      delete this.speech;
      // If there are no voices bundled, consider speech synthesis unavailable.
      if (!window.speechSynthesis ||
        window.speechSynthesis.getVoices().length === 0) {
        this.speech = null;
      }
      this.speech = window.speechSynthesis;
      return this.speech;
    },

    /**
     * Speech utterance
     * @type {Object}
     * @memberof speechSynthesizer
     */
    get utterance() {
      delete this.utterance;
      this.utterance = window.SpeechSynthesisUtterance;
      return this.utterance;
    },

    /**
     * Cancle speech if the screen reader is speaking.
     * @memberof speechSynthesizer
     */
    cancel: function ss_cancel() {
      if (this.speech) {
        this.speech.cancel();
      }
    },

    /**
     * Localize speech data.
     * @param  {Object} aDetails Speech data object.
     * @return {String} Localized speech data.
     * @memberof speechSynthesizer
     */
    localize: function ss_localize(aDetails) {
      if (!aDetails || typeof aDetails === 'string') {
        return aDetails;
      }
      var string = aDetails.string;
      var data = {
        count: aDetails.count
      };
      if (!string) {
        return '';
      } else {
        string = 'accessibility-' + string;
      }

      if (aDetails.args) {
        data = aDetails.args.reduce(function(aData, val, index) {
          aData[index] = val;
          return aData;
        }, data);
      }
      return navigator.mozL10n.get(string, data);
    },

    /**
     * Build a complete utterance string by localizing an array of speech data.
     * @param  {?Array} aData Speech data.
     * @return {String} A complete localized string from speech array data.
     * @memberof speechSynthesizer
     */
    buildUtterance: function ss_buildUtterance(aData) {
      if (!Array.isArray(aData)) {
        aData = [aData];
      }
      var words = [], localize = this.localize;
      aData.reduce(function(words, details) {
        var localized = localize(details);
        if (localized) {
          var word = localized.trim();
          if (word) {
            words.push(word);
          }
        }
        return words;
      }, words);

      return words.join(' ');
    },

    /**
     * Show caption for the screen reader.
     * @param  {String} aUtterance Current screen reader caption.
     * @memberof speechSynthesizer
     */
    showSpeech: function ar_showSpeech(aUtterance) {
      if (!this.captionsBox) {
        this.captionsBox = document.createElement('div');
        this.captionsBox.id = 'accessibility-captions-box';
        this.captionsBox.setAttribute('data-z-index-level',
          'accessibility-captions');
        this.captionsBox.setAttribute('aria-hidden', true);
        this.screen.appendChild(this.captionsBox);
      }
      window.clearTimeout(this.captionsHideTimeout);
      this.captionsHideTimeout = null;
      this.captionsBox.textContent = aUtterance;
      this.captionsBox.classList.add('visible');
    },

    /**
     * Hide current screen reader caption.
     * @param {Boolean} aImmediately A flag to hide captionsBox immediately.
     * @memberof speechSynthesizer
     */
    hideSpeech: function ar_hideSpeech(aImmediately) {
      if (!this.captionsBox) {
        return;
      }
      // Hide the caption after CAPTIONS_DELAY.
      if (aImmediately) {
        this.captionsBox.classList.remove('visible');
      } else {
        this.captionsHideTimeout = window.setTimeout(function() {
          this.captionsBox.classList.remove('visible');
        }.bind(this), this.CAPTIONS_DELAY);
      }
    },

    /**
     * Utter a message with a speechSynthesizer.
     * @param {?Array} aData A messages array to be localized.
     * @param {JSON} aOptions Options to be used when speaking. For example: {
     *   enqueue: false
     * }
     * @param {Number} aRate Speech rate.
     * @param {Number} aVolume Speech volume.
     * @param {Function} aCallback A callback after the speech synthesis is
     * completed.
     * @memberof speechSynthesizer
     */
    speak: function ss_speak(aData, aOptions, aRate, aVolume, aCallback) {
      if (!this.speech || !this.utterance) {
        if (aCallback) {
          aCallback();
        }
        return;
      }

      if (!aOptions.enqueue) {
        this.cancel();
      }

      var sentence = this.buildUtterance(aData);
      if (!sentence) {
        if (aCallback) {
          aCallback();
        }
        return;
      }

      var utterance = new this.utterance(sentence);
      utterance.volume = aVolume;
      utterance.rate = aRate;
      utterance.addEventListener('end', function() {
        if (this.captions) {
          this.hideSpeech();
        }
        if (aCallback) {
          aCallback();
        }
      }.bind(this));

      if (this.captions) {
        this.showSpeech(sentence);
      }
      this.speech.speak(utterance);
    }
  };

  exports.Accessibility = Accessibility;

}(window));
