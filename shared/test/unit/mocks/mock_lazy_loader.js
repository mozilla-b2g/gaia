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
  	var self = this;
    return new Promise(function (resolve, reject) {
      resolve(self._response);
    });
  },

  // custom response
  mockResponse: function(response) {
    this._response = response;
  },

  mTeardown: function() {
    this._response = null;
  }
};
