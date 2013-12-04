
'use strict';

var MockDownloadLauncher = {
  launch: function() {
    this.methodCalled = 'launch';
    return {};
  },

  mTeardown: function() {
    this.methodCalled = null;
  }
};
