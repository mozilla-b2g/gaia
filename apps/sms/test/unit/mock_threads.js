'use strict';

var MockThreads = {
  currentId: null,

  mTeardown: function mt_mTeardown() {
    this.currentId = null;
  },

  has: function() {
    return false;
  },
  get: function() {
  },
  set: function(id, record) {
    return {
      selectAll: false,
      deleteAll: false,
      messages: []
    };
  }
};
