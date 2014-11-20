'use strict';

(function(exports) {
  var DEBUG = false;
  /**
   * Shared some global property.
   * @type {Object}
   * @module  Service
   */
  exports.Service = {
    /**
     * Indicates the system is busy doing something.
     * Now it stands for the foreground app is not loaded yet.
     */
    isBusyLoading: function() {
      var app = window.AppWindowManager.getActiveApp();
      return app && !app.loaded;
    },
    /**
     * Record the start time of the system for later debugging usage.
     * @access private
     * @type {Number}
     * @memberOf module:Service
     */
    _start: new Date().getTime() / 1000,

    /**
     * Get current time offset from the start.
     * @return {Number} The time offset.
     * @memberOf module:Service
     */
    currentTime: function() {
      return (new Date().getTime() / 1000 - this._start).toFixed(3);
    },

    debug: function sys_debug() {
      if (DEBUG) {
        console.log('[Service]' +
          '[' + window.Service.currentTime() + ']' +
          Array.slice(arguments).concat());
      }
    },

    forceDebug: function sys_debug() {
      console.log('[Service]' +
        '[' + window.Service.currentTime() + ']' +
        Array.slice(arguments).concat());
    },

    _dump: function sys__dump() {
      try {
        throw new Error('dump');
      } catch (e) {
        console.log(e.stack);
      }
    },

    publish: function sys_publish(eventName, detail) {
      var evt = new CustomEvent(eventName, {
        bubbles: true,
        cancelable: false,
        detail: detail
      });
      window.dispatchEvent(evt);
    },

    get runningFTU() {
      if ('undefined' === typeof window.FtuLauncher) {
        return false;
      } else {
        return window.FtuLauncher.isFtuRunning();
      }
    },

    get locked() {
      return false;
    },

    get manifestURL() {
      return window.location.href.replace('index.html', 'manifest.webapp');
    }
  };
})(window);
