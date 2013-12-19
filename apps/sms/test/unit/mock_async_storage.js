/*exported MockasyncStorage */

'use strict';

var MockasyncStorage = {
  getItem: function(key, callback) {},
  setItem: function(key, value) {
    MockasyncStorage.data = value;
  },
  removeItem: function() {
    MockasyncStorage.data = null;
  }
};

MockasyncStorage.data = null;
