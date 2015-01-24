'use strict';

(function(exports) {

  /*
   * constructor
   */
  var ScreenAutoBrightness = function ScreenAutoBrightness() {
      // does nothing
  };

  /*
   * callback function to set screen brightness.
   */
  ScreenAutoBrightness.prototype.onbrightnesschange = null;

  /*
   * The auto-brightness algorithm will never set the screen brightness
   * to a value smaller than this. 0.1 seems like a good screen brightness
   * in a completely dark room on a Unagi.
   */
  ScreenAutoBrightness.prototype.AUTO_BRIGHTNESS_MINIMUM = 0.1;

  /*
   * This constant is used in the auto brightness algorithm. We take
   * the base 10 logarithm of the incoming lux value from the light
   * sensor and multiplied it by this constant. That value is used to
   * compute a weighted average with the current brightness and
   * finally that average brightess is and then clamped to the range
   * [AUTO_BRIGHTNESS_MINIMUM, 1.0].
   *
   * Making this value larger will increase the brightness for a given
   * ambient light level. At a value of about .25, the screen will be
   * at full brightness in sunlight or in a well-lighted work area.
   * At a value of about .3, the screen will typically be at maximum
   * brightness in outdoor daylight conditions, even when overcast.
   */
  ScreenAutoBrightness.prototype.AUTO_BRIGHTNESS_CONSTANT = 0.27;

  /*
   * We won't set a new brightness value if the difference between the old and
   * new ambient light sensor values is lower than this constant.
   */
  ScreenAutoBrightness.prototype.AUTO_BRIGHTNESS_MIN_DELTA = 10;

  /*
   * This variable contains the latest ambient light sensor value that was used
   * to set a brightness.
   */
  ScreenAutoBrightness.prototype._previousLux = undefined;

  /*
   * auto adjust screen delays, see autoAdjustBrightness function
   * wait for _autoAdjustDelay milliseconds before adjusting brightness value
   */
  ScreenAutoBrightness.prototype._state = 0;
  ScreenAutoBrightness.prototype._autoAdjustDelay = 750;

  /*
   * id of delay timeout
   */
  ScreenAutoBrightness.prototype._delayTimeout = null;

  /*
   * keep track of last lux value during autoAdjustBrightness delay's
   */
  ScreenAutoBrightness.prototype._autoDelayPrevLux = undefined;

  // reinitialize to start state
  ScreenAutoBrightness.prototype.reset = function() {
    this._state = 0;
    if (this._delayTimeout !== null) {
        clearTimeout(this._delayTimeout);
    }
    this._delayTimeout = null;
    this._previousLux = undefined;
    this._autoDelayPrevLux = undefined;
  };

  //
  // Automatically adjust the screen brightness based on the ambient
  // light (in lux) measured by the device light sensor
  // This function uses a state machine to delay before
  // adjusting the brightness. If the user waves a finger over
  // the sensor, the display brightness will not be changed.
  // The state machine (recorded in _autoAdjustState):
  // state 0: startup state, lux value is stored in _autoDelayPrevLux
  //          transitions to state 1 if lux delta > AUTO_BRIGHTNESS_MIN_DELTA
  // state 1: in delay timer, lux value is stored in _autoDelayPrevLux
  //          transitions to state 2 once time delay has elapsed
  // state 2: end of delay, use _autoDelayPrevLux value for screen brightness
  //          transitions to state 0 automatically
  //

  ScreenAutoBrightness.prototype.autoAdjust = function(lux) {
    if (lux < 1) { // Can't take the log of 0 or negative numbers
      lux = 1;
    }
    if (typeof this._previousLux === 'undefined') {
        this.setBrightnessFromLux(lux);
        return;
    }
    // lux change during delay timer
    if (this._state === 1) {
      this._autoDelayPrevLux = lux;
      return;
    }
    if (this._state === 0 && 
        Math.abs(this._previousLux - lux) > this.AUTO_BRIGHTNESS_MIN_DELTA) {
        // lux delta over the threshold, start a time delay, state 0 -> 1
        this._state = 1;
        this._autoDelayPrevLux = lux;
        this._delayTimeout = setTimeout((function () {
          // function called when delay has elapsed, state 1 -> 2
          this._state = 2;
          this.autoAdjust(lux); // adjust if required
        }).bind(this), this._autoAdjustDelay );
    }
    // end of delay, adjust brightness, state 2 -> 0
    else if (this._state === 2) {
      this._state = 0;
      lux = this._autoDelayPrevLux;
      if (Math.abs(this._previousLux - lux) > this.AUTO_BRIGHTNESS_MIN_DELTA) {
          this.setBrightnessFromLux(lux);
      }
    }
  };

  // Calculate and adjust the screen brightness
  ScreenAutoBrightness.prototype.setBrightnessFromLux = function(lux) {
    this._previousLux = lux;

    var computedBrightness =
      Math.log10(lux) * this.AUTO_BRIGHTNESS_CONSTANT;

    var clampedBrightness = Math.max(this.AUTO_BRIGHTNESS_MINIMUM,
                                     Math.min(1.0, computedBrightness));

    if (typeof this.onbrightnesschange === 'function') {
      this.onbrightnesschange(clampedBrightness);
    } else {
      console.log('ScreenAutoBrightness: ' + 
                  'Brightness should change but no callback attached.');
    }
  };

  exports.ScreenAutoBrightness = ScreenAutoBrightness;

}(window));
