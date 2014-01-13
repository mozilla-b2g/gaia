
'use strict';

var MockDownloadUI = {

  show: function() {
    this.methodCalled = 'show';
    return {};
  },

  mTeardown: function() {
    this.methodCalled = null;
  }

};
