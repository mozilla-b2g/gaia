'use strict';
/* globals MockDOMRequest */
/* exported MockGetDeviceStorage */

var MockGetDeviceStorage = function() {
  return {
    get: function(filepath) {
      return {
        set onsuccess(cb) {
          cb.call(this);
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
    },
    // need include libraries to test following domrequest functions
    // * /shared/test/unit/mocks/mock_event_target.js
    // * /shared/test/unit/mocks/mock_dom_request.js
    freeSpace: function freeSpace() {
      return new MockDOMRequest();
    },
    usedSpace: function usedSpace() {
      return new MockDOMRequest();
    },
    storageStatus: function storageStatus() {
      return new MockDOMRequest();
    }
  };
};
