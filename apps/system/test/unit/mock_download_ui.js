
'use strict';

var MockDownloadUI = {

  ERRORS: {},
  TYPE: {},

  show: function() {
    this.methodCalled = 'show';
    return {};
  },

  mTeardown: function() {
    this.methodCalled = null;
  }

};
