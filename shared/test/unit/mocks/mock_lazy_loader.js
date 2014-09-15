'use strict';
/* exported MockLazyLoader */

var MockLazyLoader = {
  _response: null,

  load: function(fileArray, callback) {
    if (callback) {
      callback();
    }
  },
  getJSON: function(file) {
    return Promise.resolve(this._response);
  },

  // custom response
  mockResponse: function(response) {
    this._response = response;
  },

  mTeardown: function() {
    this._response = null;
  }
};
