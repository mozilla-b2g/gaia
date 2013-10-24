define(function() {

  'use strict';

  var priv = new WeakMap();

  function Defaults() {
    this.startTime = 0;
    this.totalElapsed = 0;
    this.state = Stopwatch.RESET;
    this.laps = [];
  }

  /**
   * Stopwatch
   *
   * Create new or revive existing stopwatch objects.
   *
   * @param {Object} opts Optional stopwatch object to create or revive
   *                      a new or existing stopwatch object.
   *                 - startTime, number time in ms.
   *                 - totalElapsed, number time in ms.
   *                 - isStarted, started state boolean.
   *                 - laps, array of lap objects (lap = {time:, duration:}).
   */
  function Stopwatch(opts = {}) {
    var defaults = new Defaults();
    var obj = {};

    obj.startTime = opts.startTime || defaults.startTime;
    obj.totalElapsed = opts.totalElapsed || defaults.totalElapsed;
    obj.state = opts.state || defaults.state;
    obj.laps = opts.laps ? opts.laps.slice() : defaults.laps;

    priv.set(this, obj);
  };

  Stopwatch.RUNNING = 'RUNNING';
  Stopwatch.PAUSED = 'PAUSED';
  Stopwatch.RESET = 'RESET';

  Stopwatch.prototype = {

    constructor: Stopwatch,

    getState: function() {
      var sw = priv.get(this);
      return sw.state;
    },

    setState: function(state) {
      var sw = priv.get(this);
      sw.state = state;
    },

    /**
    * start Starts the stopwatch, either from a reset or paused state
    */
    start: function sw_start() {
      var sw = priv.get(this);
      if (sw.state === Stopwatch.RUNNING) {
        return;
      }
      sw.startTime = Date.now();
      this.setState(Stopwatch.RUNNING);
    },

    /**
    * getElapsedTime Calculates the total elapsed duration since the
    *                stopwatch was started
    * @return {Date} return total elapsed duration
    */
    getElapsedTime: function sw_getElapsedTime() {
      var sw = priv.get(this);
      var elapsed = 0;
      if (sw.state === Stopwatch.RUNNING) {
        elapsed = Date.now() - sw.startTime;
      }
      elapsed += sw.totalElapsed;
      return new Date(elapsed);
    },

    /**
    * pause Pauses the stopwatch
    */
    pause: function sw_pause() {
      var sw = priv.get(this);
      if (sw.state === Stopwatch.PAUSED) {
        return;
      }
      var elapsed = Date.now() - sw.startTime;
      sw.totalElapsed += elapsed;
      this.setState(Stopwatch.PAUSED);
    },

    /**
    * lap Calculates a new lap duration since the last lap time
    *     If the stopwatch isn't currently running, returns 0
    * @return {Date} return the lap duration
    */
    lap: function sw_lap() {
      var sw = priv.get(this);
      if (sw.state !== Stopwatch.RUNNING) {
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
      var sw = priv.get(this);
      return sw.laps.map(function(lap) {
        return lap.duration;
      });
    },

    /**
    * reset Resets the stopwatch back to 0, clears laps
    */
    reset: function sw_reset() {
      priv.set(this, new Defaults());
    },

    /**
    * toSerializable Returns a serializable object for persisting Stopwatch data
    * @return {Object} A serializable object
    */
    toSerializable: function sw_toSerializable() {
      var sw = priv.get(this);
      var obj = {};
      for (var i in sw) {
        if (sw.hasOwnProperty(i)) {
          obj[i] = Array.isArray(sw[i]) ? sw[i].slice() : sw[i];
        }
      }
      return obj;
    }

  };

  return Stopwatch;
});
