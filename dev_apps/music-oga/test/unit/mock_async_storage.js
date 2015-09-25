/* exported MockAsyncStorage */
'use strict';
var MockAsyncStorage = {
  user_data: {},

  getItem: function(key, callback) {
    callback(this.user_data[key]);
  },

  setItem: function(key, value) {
    this.user_data[key] = value;
  },

  clear: function() {
    this.user_data = {};
  }
};
