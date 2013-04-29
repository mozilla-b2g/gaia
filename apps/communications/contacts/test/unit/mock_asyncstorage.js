'use strict';

var MockAsyncStorage = {
  orderByLastName: false,
  getItem: function(key, cb) {
    if (cb) {
      cb(this.orderByLastName);
    }
  },
  setItem: function() {},
  removeItem: function() {}
};
