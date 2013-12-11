'use strict';

var MockHomescreenLauncher = {
  getHomescreen: function mhl_getHomescreen() {
    return this.mHomescreenWindow;
  },

  mHomescreenWindow: null,

  origin: 'home',

  ready: true,

  mTeardown: function mhl_mTeardown() {
    this.mHomescreenWindow = null;
    this.origin = 'home';
    this.ready = true;
  }
};
