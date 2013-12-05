
'use strict';

var MockDownloadHelper = {
  launch: function() {
    this.methodCalled = 'launch';
    return {};
  },

  remove: function() {
    this.methodCalled = 'remove';
    return {};
  },

  mTeardown: function() {
    this.methodCalled = null;
  }
};
