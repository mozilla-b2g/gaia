
'use strict';

var MockDownloadUI = {

  TYPE: {},

  show: function() {
    this.methodCalled = 'show';
    return {};
  },

  mTeardown: function() {
    this.methodCalled = null;
  }

};
