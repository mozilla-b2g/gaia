'use strict';
/* global eme */
/* global Promise */

(function(exports) {
  var DEBUG = true;

  exports.eme = {

    init: function init() {
      this.init = function noop() {
        // avoid multiple init calls
        eme.log('init: noop');
        return Promise.resolve();
      };

      if (eme.device) {
        return eme.device.init().then(function then() {
          eme.log('init', JSON.stringify(eme.device));
        });
      } else {
        // when running unit tests, device is not required
        eme.log('INIT WARNING: NO DEVICE');
        return Promise.resolve();
      }
    },

    log: function log() {
      if (DEBUG) {
        var args = Array.prototype.slice.apply(arguments);
        args.unshift('evme');
        console.log.apply(console, args);
      }
    }

  };

})(window);
