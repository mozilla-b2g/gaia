/*exported MockThreads */

'use strict';

var MockThreads = {
  currentId: null,

  mTeardown: function mt_mTeardown() {
    this.currentId = null;
  },

  has: function() {
    return false;
  }
};
