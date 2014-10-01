'use strict';

(function(exports) {
  var DEBUG = false;
  /**
   * Shared some global property.
   * @type {Object}
   * @module  System
   */
  exports.System = {
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
     * @memberOf module:System
     */
    _start: new Date().getTime() / 1000,

    /**
     * Get current time offset from the start.
     * @return {Number} The time offset.
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
          '[' + window.System.currentTime() + ']' +
          Array.slice(arguments).concat());
      }
    },

    forceDebug: function sys_debug() {
      console.log('[System]' +
        '[' + window.System.currentTime() + ']' +
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
      // Someone ask this state too early.
      if ('undefined' === typeof window.lockScreenWindowManager) {
        return false;
      } else {
        return window.lockScreenWindowManager.isActive();
      }
    },

    get manifestURL() {
      return window.location.href.replace('index.html', 'manifest.webapp');
    },

    /**
     * To request some actions of whole system.
     *
     * @param {string} action
     * @param {object} detailContent
     * @return {Promise}
     */
    request(action, detailContent) {
      switch (action) {
        case 'lock':
        case 'unlock':
          window.dispatchEvent(
            new CustomEvent('lockscreen-request-' + action, {
              detail: detailContent
            })
          );
          break;
      }
    }
  };
})(window);
