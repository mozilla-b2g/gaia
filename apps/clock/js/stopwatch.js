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

  Stopwatch.MaxLapsException = function() {
    this.message = 'You have created too many laps';
  };
  Stopwatch.MaxLapsException.prototype = Error.prototype;

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
      var now = Date.now() - sw.totalElapsed;
      sw.startTime = now;
      this.setState(Stopwatch.RUNNING);
    },

    /**
    * getElapsedTime Calculates the total elapsed duration since the
    *                stopwatch was started
    * @return {Number} return total elapsed duration.
    */
    getElapsedTime: function sw_getElapsedTime() {
      var sw = priv.get(this);
      var elapsed = 0;
      if (sw.state === Stopwatch.RUNNING) {
        elapsed = Date.now() - sw.startTime;
      } else {
        elapsed = sw.totalElapsed;
      }
      return elapsed;
    },

    /**
    * pause Pauses the stopwatch
    */
    pause: function sw_pause() {
      var sw = priv.get(this);
      if (sw.state === Stopwatch.PAUSED) {
        return;
      }
      sw.totalElapsed = Date.now() - sw.startTime;
      this.setState(Stopwatch.PAUSED);
    },

    /**
    * nextLap Calculates the duration of the next lap.
    * @return {object} return an object containing:
    *         duration - the duration of this lap in ms.
    *         time - the start time of this lap in ms from epoch.
    */
    nextLap: function sw_nextLap() {
      var sw = priv.get(this);
      var now;
      if (sw.state === Stopwatch.RUNNING) {
        now = Date.now();
      } else {
        now = sw.startTime + sw.totalElapsed;
      }

      var lastLapTime;
      var newLap = {};

      if (sw.laps.length > 0) {
        lastLapTime = sw.laps[sw.laps.length - 1].time;
      } else {
        lastLapTime = 0;
      }

      newLap.duration = now - (sw.startTime + lastLapTime);
      newLap.time = now - sw.startTime;

      return newLap;
    },

    /**
    * lap Calculates a new lap duration since the last lap time,
    *     and mutates `priv[this].laps` to contain the new value.
    *     If the stopwatch isn't currently running, returns 0.
    * @return {number} return the lap duration in ms.
    */
    lap: function sw_lap() {
      var sw = priv.get(this);
      if (sw.laps.length >=
          99 /* ensure that this matches the value in
                apps/clock/js/stopwatch_panel.js#checkLapButton */) {
        throw new MaxLapsException();
      }
      if (sw.state !== Stopwatch.RUNNING) {
        return 0;
      }
      var nl = this.nextLap();
      sw.laps.push(nl);
      return nl;
    },

    /**
    * getLaps Returns an array of laps, sorted by oldest first
    * @return {Array} return an array of laps.
    */
    getLaps: function sw_getLaps() {
      var sw = priv.get(this);
      return sw.laps.map(function(lap) {
        return lap;
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
    * @return {Object} A serializable object.
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
