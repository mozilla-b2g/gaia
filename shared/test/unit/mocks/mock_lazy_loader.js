'use strict';
/* exported MockLazyLoader */

var MockLazyLoader = {
  load: function(fileArray, callback) {
    if (callback) {
      callback();
    }
    return new Promise(function(resolve) {
      if (this.mLoadRightAway) {
        resolve();
      }
    }.bind(this));
  },

  mTeardown: function() {
    this.mLoadRightAway = false;
  },

  getJSON: function(file) {
    return Promise.resolve({});
  }
};
