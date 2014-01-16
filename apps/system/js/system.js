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

    publish: function sys_publish(eventName, detail) {
      var evt = new CustomEvent(eventName, { detail: detail });
      window.dispatchEvent(evt);
    },

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
    }
  };
}(this));
