'use strict';

(function(window) {
  var DEBUG = false;
  /**
   * Shared some global property.
   * @type {Object}
   * @module  System
   */
  window.System = {
    /**
     * Indicates the system is busy doing something.
     * Now it stands for the foreground app is not loaded yet.
     */
    isBusyLoading: function() {
      return !window.AppWindowManager.getActiveApp().loaded;
    },
    /**
     * Record the start time of the system for later debugging usage.
     * @access private
     * @type {Number}
     * @memberOf module:System
     */
    _start: new Date().getTime() / 1000,

    /**
     * Get current time offset from the start.
     * @return {Number} The time offset
     * @memberOf module:System
     */
    currentTime: function() {
      return (new Date().getTime() / 1000 - this._start).toFixed(3);
    },

    /**
     * Enable slow transition or not for debugging.
     * Note: Turn on this would make app opening/closing durations become 3s.
     * @type {Boolean}
     * @memberOf module:System
     */
    slowTransition: false,

    debug: function sys_debug() {
      if (DEBUG) {
        console.log('[System]' +
          '[' + System.currentTime() + ']' +
          Array.slice(arguments).concat());
      }
    },

    forceDebug: function sys_debug() {
      console.log('[System]' +
        '[' + System.currentTime() + ']' +
        Array.slice(arguments).concat());
    },

    _dump: function sys__dump() {
      try {
        throw new Error('dump');
      } catch (e) {
        console.log(e.stack);
      }
    },

    get locked() {
      // Someone ask this state too early.
      if ('undefined' === typeof window.lockScreenWindowManager) {
        return false;
      } else {
        // Map it from the manager who actually manage the state.
        return window.lockScreenWindowManager.states.active;
      }
    }
  };
}(this));
