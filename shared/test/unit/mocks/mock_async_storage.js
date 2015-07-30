/*exported MockasyncStorage */

'use strict';

var MockasyncStorage = {
  getItem: function(key, callback) {
    callback();
  },
  setItem: function(key, value) {},
  removeItem: function() {}
};
