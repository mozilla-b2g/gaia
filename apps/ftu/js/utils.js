/* global eventSafety */
(function(exports) {
  'use strict';

  var rdashes = /-(.)/g;

  var Utils = {
    camelCase: function ut_camelCase(str) {
      return str.replace(rdashes, function(str, p1) {
        return p1.toUpperCase();
      });
    },
    whenEvent: function (target, name, timeoutMs) {
      return new Promise((resolve, reject) => {
        eventSafety(target, name, resolve, timeoutMs || 1000);
      });
    }
  };

  exports.Utils = Utils;

}(this));
