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
   * We won't set a new brightness value if the difference between the current
   * and target brightness values is lower than this constant.
   */
  ScreenAutoBrightness.prototype.AUTO_BRIGHTNESS_MIN_DELTA = 0.1;

  ScreenAutoBrightness.prototype.SYNTHETIC_BRIGHTNESS_DELAY = 250;

  ScreenAutoBrightness.prototype._previousBrightnessValues = null;
  // Start with half of max brightness.
  ScreenAutoBrightness.prototype._currentBrightness = 0.5;

  // The interval for stepping up in milliseconds. We use a constant speed for
  // moving the brightness upward.
  ScreenAutoBrightness.prototype.STEP_INTERVAL_MS_UP = 30;

  // We use a decelerated speed for moving the brightness downward. The interval
  // is STEP_INTERVAL_MS_DOWN * a variable multiplier (with a maximum of
  // MAX_STEP_DOWN_INTERVAL_MULTIPLIER).
  ScreenAutoBrightness.prototype.STEP_INTERVAL_MS_DOWN = 150;
  ScreenAutoBrightness.prototype.MAX_STEP_DOWN_INTERVAL_MULTIPLIER = 20;

  ScreenAutoBrightness.prototype.STEP_DELTA = 0.005;

  ScreenAutoBrightness.prototype.COOL_DOWN_MS_UP = 2000;
  ScreenAutoBrightness.prototype.COOL_DOWN_MS_DOWN = 5000;

  // The current state of the state machine.
  ScreenAutoBrightness.prototype._state = undefined;

  // State machine constants.
  ScreenAutoBrightness.prototype.STATE_COOLING_DOWN = 0;
  ScreenAutoBrightness.prototype.STATE_MOVING_UP = 1;
  ScreenAutoBrightness.prototype.STATE_MOVING_DOWN = 2;
  ScreenAutoBrightness.prototype.STATE_PAUSED = 3;

  /*
   * id of delay timeout
   */
  ScreenAutoBrightness.prototype._delayTimerID = undefined;
  ScreenAutoBrightness.prototype._transitionTimerID = undefined;

  // The timestamp we set the screen brightness.
  ScreenAutoBrightness.prototype._brightnessSetTimestamp = 0;

  ScreenAutoBrightness.prototype.pause = function() {
    this._state = this.STATE_PAUSED;
  };

  ScreenAutoBrightness.prototype.resume = function() {
    // Screen brightness might be set by another module. Reget the cached
    // brightness value.
    this._currentBrightness = navigator.mozPower.screenBrightness;
    this._state = this.STATE_COOLING_DOWN;
  };

  // reinitialize to start state
  ScreenAutoBrightness.prototype.reset = function() {
    this._previousBrightnessValues = new ScreenAutoBrightnessValues();

    if (this._delayTimerID) {
      clearTimeout(this._delayTimerID);
    }
    this._delayTimerID = undefined;

    if (this._transitionTimerID) {
      clearTimeout(this._transitionTimerID);
    }
    this._transitionTimerID = undefined;

    this._state = this.STATE_COOLING_DOWN;
  };

  ScreenAutoBrightness.prototype.delayedSynthesizeBrightness = function() {
    this._delayTimerID = undefined;

    // Check again whether a new value has been pushed.
    if (Date.now() - this._previousBrightnessValues.getLatestTimestamp() >=
        this.SYNTHETIC_BRIGHTNESS_DELAY) {
      // No new value from the sensor. Synthesize one value.
      this._previousBrightnessValues.synthesizeWithLatest();
    }
    this.maybeSynthesizeBrightness();
    this.doAutoAdjust();
  };

  ScreenAutoBrightness.prototype.maybeSynthesizeBrightness = function() {
    if (this._delayTimerID) {
      clearTimeout(this._delayTimerID);
      this._delayTimerID = undefined;
    }

    // When the user enters a dark room, we might sensed the brightness values
    // like [0.5, 0.49, 0.45, 0.1], and then the sensor stops reporting new
    // values. We synthesize the sensed brightness value with a delayed timer
    // and adjust the brightness accordingly.
    if (Math.abs(this._previousBrightnessValues.getLatest() -
                 this._currentBrightness) >
          this.AUTO_BRIGHTNESS_MIN_DELTA) {
      this._delayTimerID =
          setTimeout(this.delayedSynthesizeBrightness.bind(this),
                     this.SYNTHETIC_BRIGHTNESS_DELAY);
    }
  };

  /*
   * Automatically adjust the screen brightness based on the ambient
   * light (in lux) measured by the device light sensor
   */
  ScreenAutoBrightness.prototype.autoAdjust = function(lux) {
    this._previousBrightnessValues.pushLuxValue(lux);
    this.maybeSynthesizeBrightness();
    this.doAutoAdjust();
  };

  /**
   * Dispatch to the state handling function.
   */
  ScreenAutoBrightness.prototype.doAutoAdjust = function() {
    switch (this._state) {
    case this.STATE_COOLING_DOWN:
      this.doAutoAdjustOnCoolingDown();
      break;
    case this.STATE_MOVING_UP:
      this.doAutoAdjustOnMovingUp();
      break;
    case this.STATE_MOVING_DOWN:
      this.doAutoAdjustOnMovingDown();
      break;
    case this.STATE_PAUSED:
      this.doAutoAdjustOnPaused();
      break;
    default:
      throw new Error('ScreenAutoBrightness: ' +
      'unexpected state: ' + this._state);
    }
  };

  /**
   * State machine.
   */
  ScreenAutoBrightness.prototype.doAutoAdjustOnCoolingDown = function() {
    var now = Date.now();
    var targetBrightness = this._previousBrightnessValues.getAverage();

    if (targetBrightness >
        this._currentBrightness + this.AUTO_BRIGHTNESS_MIN_DELTA) {
      if (now - this._brightnessSetTimestamp < this.COOL_DOWN_MS_UP) {
        return;
      }
      this._state = this.STATE_MOVING_UP;
      this._transitionTimerID = setTimeout(this.doAutoAdjust.bind(this),
                                           this.STEP_INTERVAL_MS_UP);
    } else if (targetBrightness <
               this._currentBrightness - this.AUTO_BRIGHTNESS_MIN_DELTA) {
      if (now - this._brightnessSetTimestamp < this.COOL_DOWN_MS_DOWN) {
        return;
      }
      this._state = this.STATE_MOVING_DOWN;
      this._nextStepDownTimeout = 0;
      this._transitionTimerID = setTimeout(this.doAutoAdjust.bind(this),
                                           this.computeStepDownTimeout());
    }
  };

  ScreenAutoBrightness.prototype.doAutoAdjustOnMovingUp = function() {
    var now = Date.now();
    var targetBrightness = this._previousBrightnessValues.getAverage();

    if (!this._transitionTimerID ||
        now - this._brightnessSetTimestamp < this.STEP_INTERVAL_MS_UP) {
      // We are no kicked by the transition timeout.
      return;
    }
    this._transitionTimerID = null;

    if (this._currentBrightness >= targetBrightness) {
      // Don't use Math.abs(): we may need to brake.
      this._state = this.STATE_COOLING_DOWN;
      return;
    }

    this.setBrightness(this._currentBrightness + this.STEP_DELTA);
    // Constant speed for moving up.
    this._transitionTimerID = setTimeout(this.doAutoAdjust.bind(this),
                                         this.STEP_INTERVAL_MS_UP);
  };

  ScreenAutoBrightness.prototype.doAutoAdjustOnMovingDown = function() {
    var targetBrightness = this._previousBrightnessValues.getAverage();
    var now = Date.now();

    if (!this._transitionTimerID ||
        now < this._nextStepDownTimeout) {
      // We are not kicked by the transition timeout.
      return;
    }
    this._transitionTimerID = null;

    if (this._currentBrightness <= targetBrightness) {
      this._state = this.STATE_COOLING_DOWN;
      return;
    }

    this.setBrightness(this._currentBrightness - this.STEP_DELTA);

    // Decelerated speed for moving down.
    var timeout = this.computeStepDownTimeout();
    this._nextStepDownTimeout = now + timeout;
    this._transitionTimerID = setTimeout(this.doAutoAdjust.bind(this),
                                         timeout);
  };

  ScreenAutoBrightness.prototype.doAutoAdjustOnPaused = function() {
    // Do nothing.
  };

  ScreenAutoBrightness.prototype.computeStepDownTimeout = function() {
    var multiplier =
      Math.min(1 / (Math.abs(this._currentBrightness -
                             this._previousBrightnessValues.getAverage())),
               this.MAX_STEP_DOWN_INTERVAL_MULTIPLIER);
    return this.STEP_INTERVAL_MS_DOWN * multiplier;
  };

  // Adjust the screen brightness
  ScreenAutoBrightness.prototype.setBrightness = function(brightness) {

    if (typeof this.onbrightnesschange === 'function') {
      this._brightnessSetTimestamp = Date.now();
      this._currentBrightness = Math.min(1.0, Math.max(0.1, brightness));
      this.onbrightnesschange(this._currentBrightness);
    } else {
      console.log('ScreenAutoBrightness: ' +
                  'Brightness should change but no callback attached.');
    }
  };

  /**
   * Utility class for collecting and processing brightness values.
   */
  function ScreenAutoBrightnessValues() {
    this._data = [];
  }

  // The size of the sliding window.
  ScreenAutoBrightnessValues.prototype.KEEP_BRIGHTNESS_VALUES = 5;

  /*
   * The auto-brightness algorithm will never set the screen brightness
   * to a value smaller than this. 0.1 seems like a good screen brightness
   * in a completely dark room on a Unagi.
   */
  ScreenAutoBrightnessValues.prototype.AUTO_BRIGHTNESS_MINIMUM = 0.1;

  ScreenAutoBrightnessValues.prototype.DEFAULT_BRIGHTNESS_VALUE = 0.5;

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
  ScreenAutoBrightnessValues.prototype.AUTO_BRIGHTNESS_CONSTANT = 0.27;

  /*
   * The sliding window keeping previous brightness values converted from lux
   * value.
   * The array elements are of object
   * {
   *   _timestamp: (timestamp in ms),
   *   _value: (brightness value [0.1, 1]
   * }
   */
  ScreenAutoBrightnessValues.prototype._data = null;

  ScreenAutoBrightnessValues.prototype.getLatestTimestamp =
  function(lux) {
    if (this._data.lenght === 0) {
      return 0;
    }

    return this._getLatestObject()._timestamp;
  };

  ScreenAutoBrightnessValues.prototype.synthesizeWithLatest = function() {
    if (this._data.length === 0) {
      return;
    }

    var latest = this._getLatestObject();
    // Push the latest brightness object again and remove the head.
    this._data.push(latest);
    this._data.shift();
  };

  // Push a brightness value to the sliding window using the sensed lux value.
  ScreenAutoBrightnessValues.prototype.pushLuxValue = function(lux) {
    var self = this;

    var latest = {
      _timestamp: Date.now(),
      _value: self.computeBrightnessFromLux(lux)
    };

    this._data.push(latest);

    if (this._data.length > this.KEEP_BRIGHTNESS_VALUES) {
      this._data.shift();
    }
  };

  ScreenAutoBrightnessValues.prototype._getLatestObject = function() {
    var lastIndex = this._data.length - 1;
    return this._data[lastIndex];
  };

  ScreenAutoBrightnessValues.prototype.getLatest = function() {
    if (this._data.length === 0) {
      return this.DEFAULT_BRIGHTNESS_VALUE;
    }

    return this._getLatestObject()._value;
  };


  ScreenAutoBrightnessValues.prototype.getAverage = function() {
    if (this._data.length === 0) {
      return this.DEFAULT_BRIGHTNESS_VALUE;
    }

    var sum = 0;
    for (var i = 0; i < this._data.length; i++) {
      sum += this._data[i]._value;
    }
    var brightness = sum/this._data.length;
    return Math.max(this.AUTO_BRIGHTNESS_MINIMUM,
                    Math.min(1.0, brightness));
  };

  // Brightness is log(lux), bounded in the range [0.1, 1].
  ScreenAutoBrightnessValues.prototype.computeBrightnessFromLux =
  function(lux) {
    if (lux < 1) { // Can't take the log of 0 or negative numbers
      lux = 1;
    }

    var computedBrightness =
      Math.log10(lux) * this.AUTO_BRIGHTNESS_CONSTANT;

    var clampedBrightness = Math.max(this.AUTO_BRIGHTNESS_MINIMUM,
                                     Math.min(1.0, computedBrightness));
    return clampedBrightness;
  };

  exports.ScreenAutoBrightnessValues = ScreenAutoBrightnessValues;
  exports.ScreenAutoBrightness = ScreenAutoBrightness;

}(window));
