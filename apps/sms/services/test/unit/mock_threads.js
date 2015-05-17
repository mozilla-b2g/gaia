/*exported MockThreads */

'use strict';

var MockThreads = {
  currentId: null,
  create: function() {

  },
  registerMessage: function() {

  },

  unregisterMessage: function() {

  },

  mTeardown: function mt_mTeardown() {
    this.currentId = null;
  },

  has: function() {
    return false;
  },
  set: function() {

  },
  get: () => { return { getDraft: () => null }; }
};
