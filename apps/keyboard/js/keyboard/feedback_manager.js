'use strict';

/* global VibrationFeedbackSettings, SoundFeedbackSettings,
          SoundFeedbackPlayer */

(function(exports) {

var VibrationFeedback = function(app) {
  this.app = app;

  this.settings = null;
};

// Keep in sync with Dialer and Lockscreen keypad vibration
VibrationFeedback.prototype.VIBRATE_MS = 50;

VibrationFeedback.prototype.start = function() {
  var settings = this.settings = new VibrationFeedbackSettings();
  settings.promiseManager = this.app.settingsPromiseManager;
  settings.initSettings().catch(function rejected() {
    console.warn('VibrationFeedback: Failed to get initial settings.');
  });
};

VibrationFeedback.prototype.stop = function() {
  this.settings = null;
};

VibrationFeedback.prototype.triggerFeedback = function() {
  if (!this.settings.initialized) {
    console.warn('VibrationFeedback: ' +
      'Sound feedback needed but settings is not available yet.');
    return;
  }

  if (typeof window.navigator.vibrate !== 'function') {
    console.warn('VibrationFeedback: ' +
      'No navigator.vibrate() on this platform.');
    return;
  }

  var vibrationFeedbackSettingsValues =
    this.settings.getSettingsSync();

  if (!vibrationFeedbackSettingsValues.vibrationEnabled) {
    return;
  }

  window.navigator.vibrate(this.VIBRATE_MS);
};

var SoundFeedback = function(app) {
  this.app = app;

  this.settings = null;
  this.clicker = null;
  this.specialClicker = null;
};

SoundFeedback.prototype.start = function() {
  var settings = this.settings = new SoundFeedbackSettings();
  settings.promiseManager = this.app.settingsPromiseManager;
  settings.onsettingchange = this._handleSettingsChange.bind(this);
  settings.initSettings().then(
    this._handleSettingsChange.bind(this),
    function rejected() {
      console.warn('SoundFeedback: Failed to get initial settings.');
    });
};

SoundFeedback.prototype.stop = function() {
  this.settings = null;
  this.player = null;
};

SoundFeedback.prototype.SPECIAL_KEY_CLASSNAME = 'special-key';

SoundFeedback.prototype._handleSettingsChange = function(settings) {
  if (settings.clickEnabled && !!settings.isSoundEnabled) {
    this.player = new SoundFeedbackPlayer();
    this.player.prepare();
  } else {
    this.player = null;
  }
};

SoundFeedback.prototype.triggerFeedback = function(target) {
  if (!this.settings.initialized) {
    console.warn('SoundFeedback: ' +
      'Sound feedback needed but settings is not available yet.');

    return;
  }

  if (!this.player) {
    // Not enabled
    return;
  }

  this.player.play(target.isSpecialKey);
};

var FeedbackManager = function(app) {
  this.app = app;

  this.vibrationFeedback = null;
  this.soundFeedback = null;
};

FeedbackManager.prototype.start = function() {
  this.vibrationFeedback = new VibrationFeedback(this.app);
  this.vibrationFeedback.start();

  this.soundFeedback = new SoundFeedback(this.app);
  this.soundFeedback.start();
};

FeedbackManager.prototype.stop = function() {
  this.settings = null;

  this.vibrationFeedback.stop();
  this.soundFeedback.stop();

  this.vibrationFeedback = null;
  this.soundFeedback = null;
};

FeedbackManager.prototype.triggerFeedback = function(target) {
  this.vibrationFeedback.triggerFeedback(target);
  this.soundFeedback.triggerFeedback(target);
};

exports.VibrationFeedback = VibrationFeedback;
exports.SoundFeedback = SoundFeedback;
exports.FeedbackManager = FeedbackManager;

})(window);
