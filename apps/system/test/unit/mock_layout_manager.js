'use strict';

var MockLayoutManager = {
  width: window.innerWidth,
  fullscreenHeight: window.innerHeight,
  usualHeight: window.innerHeight,
  availableHeight: window.innerHeight,
  keyboardEnabled: false,
  match: function() {
    return true;
  },
  mTeardown: function mlm_mTeardown() {
    this.width = window.innerWidth;
    this.fullscreenHeight = window.innerHeight;
    this.usualHeight = window.innerHeight;
    this.availableHeight = window.innerHeight;
    this.keyboardEnabled = false;
  }
};
