/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/*global SettingsListener*/

(function() {

  var AccessibilityRelay = {
    // How fast the autorepeat is.
    REPEAT_INTERVAL: 600000,
    // Maximum interval between initial and final TOGGLE_SCREEN_READER_COUNT
    // volume button presses.
    REPEAT_BUTTON_PRESS: 15000000,
    // Number of times the buttons need to be pressed before the screen reader
    // setting is toggled.
    TOGGLE_SCREEN_READER_COUNT: 6,
    /**
     * Current counter for button presses in short succession.
     * @type {Number}
     */
    counter: 0,
    /**
     * Next expected event.
     * @type {Object}
     */
    expectedEvent: {
      type: 'volume-up-button-press',
      timeStamp: 0
    },
    /**
     * Expected complete time stamp.
     * @type {Number}
     */
    expectedCompleteTimeStamp: 0,
    /**
     * Accessibility settings to be observed.
     * @type {Object} name: value pairs.
     */
    settings: {
      'accessibility.screenreader': false
    },

    /**
     * Speech Synthesis
     * @type {Object}
     */
    get speechSynthesis() {
      return window.speechSynthesis;
    },

    /**
     * AccessibilityRelay initialization.
     */
    init: function ar_init() {
      window.addEventListener('mozChromeEvent', this);

      // Attach all observers.
      for (var settingKey in this.settings) {
        SettingsListener.observe(settingKey,
          this.settings[settingKey], function observe(aValue) {
            this.settings[settingKey] = aValue;
          }.bind(this));
      }
    },

    /**
     * Reset the expected event to defaults.
     */
    reset: function ar_resetEvent() {
      this.expectedEvent = {
        type: 'volume-up-button-press',
        timeStamp: 0
      };
      this.counter = 0;
    },

    /**
     * Unset speaking flag and set the expected complete time stamp.
     * @param  {?Number} aExpectedCompleteTimeStamp Expected complete time
     * stamp.
     */
    resetSpeaking: function ar_resetSpeaking(aExpectedCompleteTimeStamp) {
      this.isSpeaking = false;
      this.expectedCompleteTimeStamp = aExpectedCompleteTimeStamp || 0;
    },

    /**
     * Handle a mozChromeEvent event.
     * @param  {Object} aEvent mozChromeEvent.
     */
    handleEvent: function ar_handleEvent(aEvent) {
      var type = aEvent.detail.type;
      var timeStamp = aEvent.timeStamp;
      var expectedEvent = this.expectedEvent;

      if (type !== 'volume-up-button-press' &&
          type !== 'volume-down-button-press') {
        return;
      }

      if (type !== expectedEvent.type || timeStamp > expectedEvent.timeStamp) {
        this.reset();
        if (type !== 'volume-up-button-press') {
          return;
        }
      }

      this.expectedEvent = {
        type: type === 'volume-up-button-press' ? 'volume-down-button-press' :
          'volume-up-button-press',
        timeStamp: timeStamp + this.REPEAT_INTERVAL
      };

      if (++this.counter < this.TOGGLE_SCREEN_READER_COUNT) {
        return;
      }

      this.reset();

      if (!this.isSpeaking && timeStamp > this.expectedCompleteTimeStamp) {
        this.speechSynthesis.cancel();
        this.announceScreenReader(function onEnd() {
          this.resetSpeaking(timeStamp + this.REPEAT_BUTTON_PRESS);
        }.bind(this));
        return;
      }

      this.speechSynthesis.cancel();
      this.resetSpeaking();
      SettingsListener.getSettingsLock().set({
        'accessibility.screenreader':
          !this.settings['accessibility.screenreader']
      });
    },

    /**
     * Utter a message with a screen reader.
     * XXX: This will need to be moved to the upcoming accessibility app.
     * @param {String} message A message key to be localized.
     * @param {Boolean} enqueue A flag to enqueue the message.
     * @param {Function} aCallback A callback after the speech synthesis is
     * completed.
     */
    utter: function ar_utter(aMessage, aEnqueue, aCallback) {
      if (!this.speechSynthesis || !window.SpeechSynthesisUtterance) {
        if (aCallback) {
          aCallback();
        }
        return;
      }
      if (!aEnqueue) {
        this.speechSynthesis.cancel();
      }
      var utterance = new window.SpeechSynthesisUtterance(navigator.mozL10n.get(
        aMessage));
      if (aCallback) {
        utterance.addEventListener('end', aCallback);
      }
      this.speechSynthesis.speak(utterance);
    },

    /**
     * Based on whether the screen reader is currently enabled, announce the
     * instructions of how to enable/disable it.
     * @param {Function} aCallback A callback after the speech synthesis is
     * completed.
     */
    announceScreenReader: function ar_announceScreenReader(aCallback) {
      var enabled = this.settings['accessibility.screenreader'];
      this.isSpeaking = true;
      this.utter(enabled ? 'disableScreenReaderSteps' :
        'enableScreenReaderSteps', false, aCallback);
    }
  };

  AccessibilityRelay.init();

})();
