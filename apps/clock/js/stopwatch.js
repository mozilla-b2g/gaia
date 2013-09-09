(function(exports) {

  'use strict';

  var wm = new WeakMap();

  function Defaults() {
    this.startTime = 0;
    this.totalElapsed = 0;
    this.isStarted = false;
    this.laps = [];
  }

  function Stopwatch() {
    this.reset();
  };

  Stopwatch.prototype = {

    constructor: Stopwatch,

    /**
    * isStarted Returns the isStarted state
    *
    * @return {boolean} return isStarted state
    */
    isStarted: function sw_isStarted() {
      var sw = wm.get(this);
      return sw.isStarted;
    },

    /**
    * start Starts the stopwatch, either from a reset or paused state
    */
    start: function sw_start() {
      var sw = wm.get(this);
      if (sw.isStarted) {
        return;
      }
      sw.startTime = Date.now();
      sw.isStarted = true;
    },

    /**
    * getElapsedTime Calculates the total elapsed duration since the
    *                stopwatch was started
    * @return {Date} return total elapsed duration
    */
    getElapsedTime: function sw_getElapsedTime() {
      var sw = wm.get(this);
      var elapsed = 0;
      if (sw.isStarted) {
        elapsed = Date.now() - sw.startTime;
      }
      elapsed += sw.totalElapsed;

      return new Date(elapsed);
    },

    /**
    * pause Pauses the stopwatch
    */
    pause: function sw_pause() {
      var sw = wm.get(this);
      if (!sw.isStarted) {
        return;
      }
      sw.isStarted = false;
      var elapsed = Date.now() - sw.startTime;
      sw.totalElapsed += elapsed;
    },

    /**
    * lap Calculates a new lap duration since the last lap time
    *     If the stopwatch isn't currently running, returns 0
    * @return {Date} return the lap duration
    */
    lap: function sw_lap() {
      var sw = wm.get(this);
      if (!sw.isStarted) {
        return new Date(0);
      }

      var lastLapTime;
      var newLap = {};

      if (sw.laps.length > 0) {
        lastLapTime = sw.laps[sw.laps.length - 1].time;
      } else {
        lastLapTime = sw.startTime;
      }

      var lastTime = lastLapTime > sw.startTime ? lastLapTime : sw.startTime;
      newLap.duration = Date.now() - lastTime;
      newLap.time = Date.now();
      sw.laps.push(newLap);

      return new Date(newLap.duration);
    },

    /**
    * getLapDurations Returns an array of lap durations, sorted by oldest first
    * @return {Array} return an array of lap durations
    */
    getLapDurations: function sw_getLapDurations() {
      var sw = wm.get(this);
      return sw.laps.map(function(lap) {
        return lap.duration;
      });
    },

    /**
    * reset Resets the stopwatch back to 0, clears laps
    */
    reset: function sw_reset() {
      wm.set(this, new Defaults());
    }

  };

  exports.Stopwatch = Stopwatch;

})(this);
