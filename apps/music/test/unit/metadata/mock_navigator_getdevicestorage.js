'use strict';
/* globals MockDOMRequest */
/* exported MockGetDeviceStorage */

var MockFileStore = {
  _data: {},

  get: function(store, filename) {
    if (this._data[store]) {
      return this._data[store][filename];
    }
    return undefined;
  },

  set: function(store, filename, data) {
    if (!(store in this._data)) {
      this._data[store] = {};
    }
    this._data[store][filename] = data;
  },

  readAsText: function(store, filename) {
    var self = this;
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.readAsText(self.get(store, filename));
      reader.onload = function() {
        resolve(reader.result);
      };
      reader.onerror = function() {
        reject(reader.error);
      };
    });
  }
};

var MockGetDeviceStorage = function(store) {
  return {
    get: function(filename) {
      return {
        set onsuccess(cb) {
          if (MockFileStore.get(store, filename)) {
            cb.call(this);
          }
        },
        set onerror(cb) {
          if (!MockFileStore.get(store, filename)) {
            cb.call(this);
          }
        },
        get result() {
          return MockFileStore.get(store, filename);
        }
      };
    },
    addNamed: function(blob, filename) {
      var file = new Blob([blob], {type: blob.type});
      file.name = filename;
      MockFileStore.set(store, filename, file);

      return {
        set onsuccess(cb) {
          cb({ target: {result: filename} });
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
    }
  };
};
