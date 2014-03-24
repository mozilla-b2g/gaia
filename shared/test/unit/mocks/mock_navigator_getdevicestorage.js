'use strict';
/* exported MockGetDeviceStorage */

/* Allow setter without getter */
/* jshint -W078 */


var MockGetDeviceStorage = function() {
  return {
    get: function(filepath) {
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
    addNamed: function(contact, filename) {
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
    },
    addEventListener: function() {
      // Do nothing
    },
    available: function() {
      return {
        set onsuccess(cb) {
          setTimeout(cb);
        },
        get result() {
          return 'available';
        }
      };
    }
  };
};
