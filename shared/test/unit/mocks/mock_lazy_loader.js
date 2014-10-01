'use strict';
/* exported MockLazyLoader */

var MockLazyLoader = {
  _response: null,

  load: function(fileArray, callback) {
    if (callback) {
      callback();
    }
  },
  /**
   * This method returns a Promise. if needed you should install a
   * sinon.spy on the method and retrive the Promise instance with
   * 'spy.getCall(0).returnValue'.
   */
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
