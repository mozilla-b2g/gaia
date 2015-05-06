
'use strict';
/* exported MockDownloadHelper */
var MockDownloadHelper = {
  open: function() {
    this.methodCalled = 'open';
    return {};
  },

  remove: function() {
    this.methodCalled = 'remove';
    return {};
  },

  bytes: 1000,

  getFreeSpace: function(cb) {
    this.methodCalled = 'getFreeSpace';
    cb(this.bytes);
  },

  mTeardown: function() {
    this.bytes = 1000;
    this.methodCalled = null;
  }
};
