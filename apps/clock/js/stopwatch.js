(function(exports) {

  'use strict';

  var priv = new WeakMap();

  function Stopwatch() {
    priv.set(this, {});

    this.reset();
  };

  Object.defineProperty(Stopwatch, 'DEFAULTS', {
    value: {
      startTime: 0,
      totalElapsed: 0,
      isStarted: false,
      laps: []
    }
  });

  Stopwatch.prototype = {

    constructor: Stopwatch,

    /**
    * start Starts the stopwatch, either from a reset or paused state
    */
    start: function sw_start() {
      if (priv.get(this)['isStarted']) {
        return;
      }
      priv.get(this)['startTime'] = Date.now();
      priv.get(this)['isStarted'] = true;
    },

    /**
    * getElapsedTime Calculates the total elapsed duration since the
    *                stopwatch was started
    *
    * @return {Date} return total elapsed duration
    */
    getElapsedTime: function sw_getElapsedTime() {
      var elapsed = 0;
      if (priv.get(this)['isStarted']) {
        elapsed = Date.now() - priv.get(this)['startTime'];
      }
      elapsed += priv.get(this)['totalElapsed'];

      return new Date(elapsed);
    },

    /**
    * pause Pauses the stopwatch
    */
    pause: function sw_pause() {
      if (!priv.get(this)['isStarted']) {
        return;
      }
      priv.get(this)['isStarted'] = false;
      var elapsed = Date.now() - priv.get(this)['startTime'];
      priv.get(this)['totalElapsed'] += elapsed;
    },

    /**
    * lap Calculates a new lap duration since the last lap time
    *     If the stopwatch isn't currently running, returns 0
    *
    * @return {Date} return the lap duration
    */
    lap: function sw_lap() {
      if (!priv.get(this)['isStarted']) {
        return new Date(0);
      }

      var lastLapTime;
      var newLap = {};

      if (priv.get(this)['laps'].length > 0) {
        var l = priv.get(this)['laps'];
        lastLapTime = l[l.length - 1].time;
      } else {
        lastLapTime = priv.get(this)['startTime'];
      }

      newLap.duration = Date.now() - lastLapTime;
      newLap.time = Date.now();
      priv.get(this)['laps'].push(newLap);

      return new Date(newLap.duration);
    },

    /**
    * getLapDurations Returns an array of lap durations, sorted by oldest first
    *
    * @return {Array} return an array of lap durations
    */
    getLapDurations: function sw_getLapDurations() {
      var l = priv.get(this)['laps'];
      return l.map(function(lap) {
        return lap.duration;
      });
    },

    /**
    * reset Resets the stopwatch back to 0, clears laps
    */
    reset: function sw_reset() {
      Utils.extend(priv.get(this), Stopwatch.DEFAULTS);
    }

  };

  exports.Stopwatch = Stopwatch;

})(this);
