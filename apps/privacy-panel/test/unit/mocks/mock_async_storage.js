define(function() {
  'use strict';

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

  return MockasyncStorage;
});


