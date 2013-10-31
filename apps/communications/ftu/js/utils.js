'use strict';

(function(exports) {

  var rdashes = /-(.)/g;

  var Utils = {
    camelCase: function ut_camelCase(str) {
      return str.replace(rdashes, function(str, p1) {
        return p1.toUpperCase();
      });
    }
  };

  exports.Utils = Utils;

}(this));
