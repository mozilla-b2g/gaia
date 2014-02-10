/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function() {

  var AccessibilityRelay = {
    // How fast the autorepeat is.
    REPEAT_INTERVAL: 1000,
    // Timeout to allow for the next 3 sleep button presses.
    REPEAT_THREE_SLEEP_BUTTON_PRESS: 30000,
    // Number times the sleep button needs to be pressed before the screen
    // reader setting is toggled.
    TOGGLE_SCREEN_READER_COUNT: 3,
    /**
     * Current counter of sleep button presses in short succession.
     * @type {Number}
     */
    counter: 0,
    /**
     * A flag indicating that the initial 3 sleep button presses are done.
     * @type {Boolean}
     */
    initalActivateComplete: false,
    /**
     * Current reset state timeout.
     * @type {?Number}
     */
    timer: null,
    /**
     * Initial activate complete state timeout.
     * @type {?Number}
     */
    initalActivateCompleteTimer: null,
    /**
     * Accessibility settings to be observed.
     * @type {Object} name: value pairs.
     */
    settings: {
      'accessibility.screenreader': false,
      'accessibility.invert': false
    },

    /**
     * Observer functions to be used on setting change.
     * @type {Object}
     */
    observers: {
      'accessibility.screenreader': 'observeScreenReaderSetting',
      'accessibility.invert': 'observeInvertSetting'
    },

    /**
     * AccessibilityRelay initialization.
     */
    init: function ar_init() {
      window.addEventListener('mozChromeEvent', this);

      // Attach all observers.
      for (var settingKey in this.settings) {
        var observerName = this.observers[settingKey];
        if (observerName) {
          SettingsListener.observe(settingKey, this.settings[settingKey],
            this[observerName].bind(this));
        }
      }
    },

    /**
     * Reset current timeout and counter.
     */
    reset: function ar_reset() {
      clearTimeout(this.timer);
      this.counter = 0;
    },

    /**
     * Reset the initial 3 activation presses.
     */
    resetInitialFlag: function ar_resetInitialFlag() {
      clearTimeout(this.initalActivateCompleteTimer);
      this.initalActivateComplete = false;
    },

    /**
     * Handle a mozChromeEvent event (currently only sleep-button-press).
     * @param  {Object} event mozChromeEvent
     */
    handleEvent: function ar_handleEvent(event) {
      if (event.detail.type !== 'sleep-button-press') {
        return;
      }
      clearTimeout(this.timer);
      this.counter++;

      if (this.counter < this.TOGGLE_SCREEN_READER_COUNT) {
        this.timer = setTimeout(this.reset.bind(this), this.REPEAT_INTERVAL);
        return;
      }
      this.reset();

      if (!this.initalActivateComplete) {
        this.announceScreenReader();
        return;
      }

      this.resetInitialFlag();
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
     */
    utter: function ar_utter(aMessage, aEnqueue) {
      if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
        return;
      }
      if (!aEnqueue) {
        window.speechSynthesis.cancel();
      }
      var utterance = new window.SpeechSynthesisUtterance(navigator.mozL10n.get(
        aMessage));
      window.speechSynthesis.speak(utterance);
    },

    /**
     * Based on whether the screen reader is currently enabled, announce the
     * instructions of how to enable/disable it.
     */
    announceScreenReader: function ar_announceScreenReader() {
      var enabled = this.settings['accessibility.screenreader'];
      this.utter(enabled ? 'disableScreenReaderInstructions' :
        'enableScreenReaderInstructions');
      this.initalActivateComplete = true;
      this.initalActivateCompleteTimer = setTimeout(
        this.resetInitialFlag.bind(this), this.REPEAT_THREE_SLEEP_BUTTON_PRESS);
    },

    /**
     * Handle screen reader setting change. Toggle the screen reader based on
     * the setting.
     * @param  {Boolean} value 'accessibility.screenreader' setting value.
     */
    observeScreenReaderSetting: function ar_observeScreenReaderSetting(value) {
      this.settings['accessibility.screenreader'] = value;
      var event = new CustomEvent('mozContentEvent', {
        bubbles: true,
        cancelable: true,
        detail: {
          type: 'accessibility-screenreader',
          enabled: value
        }
      });
      window.dispatchEvent(event);
    },

    /**
     * Handle invert setting change. Toggle the 'accessibility-invert' class
     * for the screen element.
     * @param  {Boolean} value 'accessibility.invert' setting value.
     */
    observeInvertSetting: function ar_observeInvertSetting(value) {
      this.settings['accessibility.invert'] = value;
      var screen = document.getElementById('screen');
      if (value) {
        screen.classList.add('accessibility-invert');
      }
      else {
        screen.classList.remove('accessibility-invert');
      }
    }
  };

  AccessibilityRelay.init();

})();
