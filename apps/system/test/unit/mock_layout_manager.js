'use strict';

var MockLayoutManager = {
  width: window.innerWidth,
  height: window.innerHeight,
  keyboardEnabled: false,
  match: function() {
    return true;
  },
  mTeardown: function mlm_mTeardown() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.keyboardEnabled = false;
  }
};
