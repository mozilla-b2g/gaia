'use strict';

(function(exports) {
  /**
   * ScreenBrightnessTransition can be constructed whenever we need to
   * transition the brightness. The single instance can be reused too,
   * but you must abort() the transition before asking for a new transition.
   *
   * I intend to let ScreenManager re-use one instance but allow the future,
   * rewritten screen brightness controls create and throw instances (hence
   * the absence of start() and stop() methods.)
   *
   */
  var ScreenBrightnessTransition = function ScreenBrightnessTransition() {
    this.isRunning = false;

    this._timer = undefined;
  };

  ScreenBrightnessTransition.prototype.STEP_INTERVAL_MS = 20;
  ScreenBrightnessTransition.prototype.STEP_DELTA = 0.01;

  ScreenBrightnessTransition.prototype.onsuccess = null;

  ScreenBrightnessTransition.prototype.transitionTo = function(brightness) {
    if (this.isRunning) {
      throw new Error('ScreenBrightnessTransition: ' +
        'transitionTo() is called again during transition.');
    }

    this.isRunning = true;

    // For now this is still an naive linear transition that takes the
    // brightness to whatever current value to the target value, as we
    // implemented in ScreenManager.
    // TODO Please improve this code by working on bug 1042673, bug 1064683,
    // and/or bug 819744.
    var currentBrightness = navigator.mozPower.screenBrightness;
    this._timer = setInterval(function brightnessTransitionTick() {
      // We should never read back the current brightness during transition
      // from mozPower coz it would be rounded to the nearest 1/256 value
      // (instead of being a real float) under the current Gonk implementation.
      // Noted that the actual brightness steps is hardware-dependent,
      // not 256 steps.
      // So in here, we simply add/substract currentBrightness to make it the
      // new value we want to be.
      var delta = this.STEP_DELTA * ((currentBrightness > brightness) ? -1 : 1);
      currentBrightness += delta;

      if ((delta < 0 && currentBrightness < brightness) ||
          (delta > 0 && currentBrightness > brightness)) {
        // If we are overshot the target brightness,
        // set the final value and stop.
        navigator.mozPower.screenBrightness = brightness;

        clearTimeout(this._timer);
        this.isRunning = false;

        if (typeof this.onsuccess === 'function') {
          this.onsuccess();
        }

        return;
      } else {
        // The show must go on; set the current value.
        navigator.mozPower.screenBrightness = currentBrightness;
      }
    }.bind(this), this.STEP_INTERVAL_MS);
  };

  ScreenBrightnessTransition.prototype.abort = function() {
    if (!this.isRunning) {
      throw new Error('ScreenBrightnessTransition: ' +
        'abort() is called but it is not currently in transition.');
    }

    clearTimeout(this._timer);
    this.isRunning = false;
  };

  exports.ScreenBrightnessTransition = ScreenBrightnessTransition;
}(window));
