(function(exports) {

  'use strict';

  function Stopwatch() {
    this._startTime = 0;
    this._totalElapsed = 0;
    this._started = false;
    this._laps = [];
  };

  Stopwatch.prototype = {

    constructor: Stopwatch,

   /**
   * start Starts the stopwatch timer, either from a reset or paused state
   */
    start: function sw_start() {
      if (!this._started) {
        this._startTime = new Date().getTime();
        this._started = true;
      }
    },

    /**
    * getElapsedTime Calculates the total elapsed duration since the
    *                stopwatch was started
    *
    * @return {Date} return total elapsed duration
    */
    getElapsedTime: function sw_elapsed() {
      var elapsed = 0;
      if (this._started)
        elapsed = new Date().getTime() - this._startTime;
      elapsed += this._totalElapsed;

      return new Date(elapsed);
    },

    /**
    * pause Pauses the stopwatch timer
    */
    pause: function sw_pause() {
      if (this._started) {
        this._started = false;
        var elapsed = new Date().getTime() - this._startTime;
        this._totalElapsed += elapsed;
      }
    },

    /**
    * lap Calculates a new lap duration since the last lap time
    *     If the stopwatch isn't currently running, returns 00:00
    *
    * @return {Date} return the lap duration
    */
    lap: function sw_lap() {
      if (this._started) {
        var lastLapTime;
        var newLap = {};

        if (this._laps.length > 0) {
          lastLapTime = this._laps[this._laps.length - 1].time;
        } else {
          lastLapTime = this._startTime;
        }

        newLap.duration = new Date().getTime() - lastLapTime;
        newLap.time = new Date().getTime();
        this._laps.push(newLap);

        return new Date(newLap.duration);
      } else {
        return new Date(0);
      }
    },

    /**
    * reset Resets the stopwatch timer back to 00:00, clears laps
    */
    reset: function sw_reset() {
      this._startTime = new Date().getTime();
      this._totalElapsed = 0;
      this._started = false;
      this._laps = [];
    }

  };

  exports.Stopwatch = Stopwatch;

})(this);
