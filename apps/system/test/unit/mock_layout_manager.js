'use strict';

var MockLayoutManager = function() {};
MockLayoutManager.prototype = {
  width: window.innerWidth,
  fullscreenHeight: window.innerHeight,
  usualHeight: window.innerHeight,
  keyboardEnabled: false,
  match: function() {
    return true;
  },
  start: function() {
    return this;
  },
  mTeardown: function mlm_mTeardown() {
    this.width = window.innerWidth;
    this.fullscreenHeight = window.innerHeight;
    this.usualHeight = window.innerHeight;
    this.keyboardEnabled = false;
  }
};
