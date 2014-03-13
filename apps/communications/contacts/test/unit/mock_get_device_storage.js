'use strict';
/* exported MockgetDeviceStorage */

/* Allow setter without getter */
/* jshint -W078 */

var MockgetDeviceStorage = function() {
  return {
    'get': function(filepath) {
      return {
        set onsuccess(cb) {
          cb();
        },
        get result() {
          var file = {
            name: filepath,
            size: 1
          };
          return file;
        }
      };
    },
    'addNamed': function(contact, filename) {
      var response = {
        target: {
          result: filename
        }
      };
      return {
        set onsuccess(cb) {
          cb(response);
        }
      };
    }
  };
};
