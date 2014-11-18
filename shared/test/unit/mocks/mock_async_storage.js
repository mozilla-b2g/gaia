'use strict';
/* exported MockasyncStorage */
var MockasyncStorage = {
  data: {},
  getItem: function(key, callback) {
    callback(this.data[key]);
  },
  setItem: function(key, value, callback) {
    this.data[key] = value;
    callback();
  }
};
