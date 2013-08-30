(function(exports) {

  'use strict';

  function Stopwatch() {
    this.reset();
  };

  Stopwatch.prototype = {

    constructor: Stopwatch,

   /**
   * start Starts the stopwatch, either from a reset or paused state
   */
    start: function sw_start() {
      if (this._isStarted) {
        return;
      }
      this._startTime = Date.now();
      this._isStarted = true;
    },

    /**
    * getElapsedTime Calculates the total elapsed duration since the
    *                stopwatch was started
    *
    * @return {Date} return total elapsed duration
    */
    getElapsedTime: function sw_getElapsedTime() {
      var elapsed = 0;
      if (this._isStarted) {
        elapsed = Date.now() - this._startTime;
      }
      elapsed += this._totalElapsed;

      return new Date(elapsed);
    },

    /**
    * pause Pauses the stopwatch
    */
    pause: function sw_pause() {
      if (!this._isStarted) {
        return;
      }
      this._isStarted = false;
      var elapsed = Date.now() - this._startTime;
      this._totalElapsed += elapsed;
    },

    /**
    * lap Calculates a new lap duration since the last lap time
    *     If the stopwatch isn't currently running, returns 0
    *
    * @return {Date} return the lap duration
    */
    lap: function sw_lap() {
      if (!this._isStarted) {
        return new Date(0);
      }

      var lastLapTime;
      var newLap = {};

      if (this._laps.length > 0) {
        lastLapTime = this._laps[this._laps.length - 1].time;
      } else {
        lastLapTime = this._startTime;
      }

      newLap.duration = Date.now() - lastLapTime;
      newLap.time = Date.now();
      this._laps.push(newLap);

      return new Date(newLap.duration);
    },

    /**
    * getLaps Returns an array of lap durations, sorted by oldest first
    *
    * @return {Array} return an array of lap durations
    */
    getLaps: function sw_getLaps() {
      var l = [];
      for (var i = 0; i < this._laps.length; i++) {
        l.push(this._laps[i].duration);
      }
      return l;
    },

    /**
    * reset Resets the stopwatch back to 0, clears laps
    */
    reset: function sw_reset() {
      this._startTime = 0;
      this._totalElapsed = 0;
      this._isStarted = false;
      this._laps = [];
    }

  };

  exports.Stopwatch = Stopwatch;

})(this);
