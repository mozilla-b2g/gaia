'use strict';
/* global eme */
/* global Promise */

(function(exports) {

  const mozSettings = navigator.mozSettings;

  const DEBUG = true;

  var initPromise = null;
  var slice = Function.call.bind(Array.prototype.slice);

  exports.eme = {
    config: {
      apiUrl: null
    },

    init: function init() {
      if (initPromise) {
        return initPromise;
      }

      initPromise = this.readSettings()
      .then(
        function success(settings) {
          // config overrides
          if (settings['appsearch.url']) {
            this.config.apiUrl = settings['appsearch.url'];
          }

          // wait for device init
          return this.device.init(settings);
        }.bind(this),

        function error(e) {
          eme.log('fatal error accessing device settings', e);
        }

      ).catch(function(e) {
        eme.log('init failed', e);
      });

      // avoid multiple init calls
      this.init = function noop() {
        eme.log('init: noop');
        return initPromise;
      };

      return initPromise;
    },

    readSettings: function readSettings() {
      return new Promise(function ready(resolve, reject) {
        var lock = mozSettings.createLock();
        var request = lock.get('*');

        request.onsuccess = function onsuccess() {
          resolve(request.result);
        };
        request.onerror = function onerror() {
          reject(request.error);
        };

      }.bind(this));
    },

    log: function log() {
      if (DEBUG) {
        var args = slice(arguments);
        args.unshift('evme');
        console.log.apply(console, args);
      }
    },
    warn: function warn() {
      var args = slice(arguments);
      args.unshift('evme', 'WARNING');
      console.warn.apply(console, args);
    },
    error: function error() {
      var args = slice(arguments);
      args.unshift('evme', 'ERROR');
      console.error.apply(console, args);
    }

  };

})(window);
