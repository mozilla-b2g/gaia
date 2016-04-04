'use strict';

(function(exports) {

  exports = exports || {};

  var mozContactUtils = {
    // Checks if an object fields are empty, by empty means
    // field is null and if it's an array it's length is 0
    haveEmptyFields: function (obj, fields) {
      if (obj === null ||
          typeof(obj) != 'object' ||
          !fields || !fields.length) {
        return true;
      }

      var attr;
      for (var i = 0; i < fields.length; i++) {
        attr = fields[i];
        if (obj[attr]) {
          if (Array.isArray(obj[attr])) {
            if (obj[attr].length > 0) {
              return false;
            }
          } else {
            return false;
          }
        }
      }
      return true;
    }
  };

  exports.mozContact = mozContactUtils;

})(window.utils);
