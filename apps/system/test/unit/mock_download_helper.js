
'use strict';

var MockDownloadHelper = {
  open: function() {
    this.methodCalled = 'open';
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
