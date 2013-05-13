
/**
 * @fileoverview Calendar.Utils.HourlyUpdater is an easy
 *     way for objects to opt in to being notified when time passes.
 *     Objects can initialize a HourlyUpdater with an instance
 *     of themselves. Then calling "start" tells the HourlyUpdater
 *     to invoke a callback method at the top of every hour
 *     (this behavior can be overridden) and calling "stop" tells the
 *     HourlyUpdater to suspend calling until "start" is called
 *     again.
 */
Calendar.ns('Utils').HourlyUpdater = (function() {
  /**
   * @constructor
   * @param {Object} object Object to notify.
   * @param {number=} idleTimeout Optional number of seconds used
   *     to decide that a user is idle.
   */
  function HourlyUpdater(object, idleTimeout) {
    this._object = object;
    if (idleTimeout !== undefined) {
      this._idleObserver.time = idleTimeout;
    }
  }


  HourlyUpdater.prototype = {
    /**
     * Some function to execute every so often.
     * @type {Function}
     */
    _cb: null,

    /**
     * Whether or not the user is idle.
     * @type {boolean}
     */
    _idle: true,

    _idleObserver: {
      /**
       * The number of seconds of idle activity after which we consider
       * the user idle.
       * @type {number}
       */
      time: 10,

      onidle: function() {
        this._idle = true;
      }.bind(this),

      onactive: function() {
        this._idle = false;
      }.bind(this)
    },

    /** @type {number=} */
    _reloadTimeoutId: undefined,

    _object: null,

    /**
     * Begin calling at the top of the hour.
     * @param {Function} cb Some function to execute.
     * @param {Object=} context Optional object to call cb on.
     */
    start: function(cb, context) {
      this._cb = cb;
      if (context !== undefined) {
        this._cb = this._cb.bind(context);
      }

      try {
        navigator.addIdleObserver(this._idleObserver);
      } catch (e) {
        if (e.name !== 'SecurityError') {
          throw e;
        }
      }

      this._setReloading(true);
      window.addEventListener(
          'mozvisibilitychange', this._onMozVisibilityChange.bind(this));
    },

    /**
     * Stop reloading the view at the top of the hour.
     */
    stop: function() {
      delete this._cb;

      try {
        navigator.removeIdleObserver(this._idleObserver);
      } catch (e) {
        if (e.name !== 'SecurityError') {
          throw e;
        }
      }

      this._setReloading(false);
      window.removeEventListener(
          'mozvisibilitychange', this._onMozVisibilityChange.bind(this));
    },

    /**
     * @param {boolean} reloading Whether or not the view is reloading.
     * @param {number=} timeout An optional time until reload.
     *     If no timeout is given, wait until the hour change.
     */
    _setReloading: function(reloading, timeout) {
      if (!reloading) {
        if (this._reloadTimeoutId !== undefined) {
          clearTimeout(this._reloadTimeoutId);
          delete this._reloadTimeoutId;
        }

        return;
      }

      if (timeout === undefined) {
        timeout = this._millisUntilHour();
      }

      this._reloadTimeoutId = setTimeout(function() {
        if (this._idle) {
          this._cb();
        }

        this._setReloading(true);
      }.bind(this), timeout);
    },

    _onMozVisibilityChange: function() {
      if (document.hidden) {
        this.stop();
      } else {
        this.start();
      }
    },

    /**
     * @return {number} Amount of time in ms until the end of the hour.
     */
    _millisUntilHour: function() {
      var date = new Date();
      var millis = 1000 * (
          60 * (59 - date.getMinutes()) +
          (60 - date.getSeconds())
      );

      return millis;
    }
  };

  return HourlyUpdater;
}());
