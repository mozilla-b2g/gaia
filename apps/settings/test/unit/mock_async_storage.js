/* exported MockAsyncStorage */
'use strict';
var MockAsyncStorage = {
  user_data: {},

  getItem: function(key, callback) {
    callback(MockAsyncStorage.user_data[key]);
  },

  setItem: function(key, value) {
    MockAsyncStorage.user_data[key] = value;
  }
};
