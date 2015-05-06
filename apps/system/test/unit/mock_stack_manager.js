'use strict';
/* exported MockStackManager */

var MockStackManager = {
  mCurrent: 0,
  mStack: [],
  mOutOfstack: false,

  init: function sm_init() {
  },

  getCurrent: function sm_getCurrent() {
    return this.mStack[this.mCurrent];
  },
  getPrev: function sm_getPrev() {
  },
  getNext: function sm_getNext() {
  },

  outOfStack: function sm_outOfStack() {
    return this.mOutOfStack;
  },

  goPrev: function sm_goPrev() {
  },
  goNext: function sm_goNext() {
  },

  commit: function() {},
  commitClose: function() {},

  snapshot: function sm_snapshot() {
    return this.mStack.slice(0);
  },

  get length() {
    return this.mStack.length;
  },
  get position() {
    return this.mCurrent;
  }
};
