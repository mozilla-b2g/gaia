/**
 * WifiWps is a module that stores some functions that would be called
 * when doing wps related operations
 *
 * @module wifi_wps/wifi_wps
 */
define(function(require) {
  'use strict';

  var WifiWps = function() {
    return {
      /**
       * To make sure wps pin is valid or not
       * @param {String} pin - value of pin
       * @returns {Boolean}
       */
      _isValidWpsPin: function(pin) {
        if (pin.match(/[^0-9]+/)) {
          return false;
        }
        if (pin.length === 4) {
          return true;
        }
        if (pin.length !== 8) {
          return false;
        }
        var num = pin - 0;
        return this._pinChecksum(Math.floor(num / 10)) === (num % 10);
      },
      /**
       * This is an inner function that we can use it to get
       * pin's checksum
       *
       * @param {Number} pin - value of pin
       * @returns {Number}
       */
      _pinChecksum: function(pin) {
        var accum = 0;
        while (pin > 0) {
          accum += 3 * (pin % 10);
          pin = Math.floor(pin / 10);
          accum += pin % 10;
          pin = Math.floor(pin / 10);
        }
        return (10 - accum % 10) % 10;
      }
    };
  };

  return WifiWps;
});
