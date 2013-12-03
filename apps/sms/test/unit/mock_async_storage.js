/*exported MockasyncStorage */

'use strict';

var MockasyncStorage = {
  getItem: function(key, callback) {
    setTimeout(function() {
      callback(MockasyncStorage.data);
    });
  },
  setItem: function(key, value) {
    MockasyncStorage.data = value;
  },
  removeItem: function() {
    MockasyncStorage.data = null;
  }
};

MockasyncStorage.data = null;
