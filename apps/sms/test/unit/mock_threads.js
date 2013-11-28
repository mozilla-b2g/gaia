/*exported MockThreads */

'use strict';

var MockThreads = {
  currentId: null,
  createThreadMockup: function() {

  },
  registerMessage: function() {

  },
  mTeardown: function mt_mTeardown() {
    this.currentId = null;
  },

  has: function() {
    return false;
  },
  set: function() {

  },
  get: function() {
    return {};
  }
};
