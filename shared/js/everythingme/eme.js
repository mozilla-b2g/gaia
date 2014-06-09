'use strict';
/* global eme */
/* global Promise */

(function(exports) {
  var DEBUG = true;
  var initPromise = null;

  exports.eme = {

    init: function init() {
      if (eme.device) {
        initPromise = eme.device.init().then(function then() {
          eme.log('init', JSON.stringify(eme.device));
        });
      } else {
        // device is not required when running tests
        eme.warn('INIT: NO DEVICE');
        initPromise = Promise.resolve();
      }

      this.init = function noop() {
        // avoid multiple init calls
        eme.log('init: noop');
        return initPromise;
      };

      return initPromise;
    },

    log: function log() {
      if (DEBUG) {
        var args = Array.prototype.slice.apply(arguments);
        args.unshift('evme');
        console.log.apply(console, args);
      }
    },
    warn: function warn() {
      var args = Array.prototype.slice.apply(arguments);
      args.unshift('evme', 'WARNING');
      console.warn.apply(console, args);
    }

  };

})(window);
