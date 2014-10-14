'use strict';

(function(exports) {

  var MockHomescreenWindowManager = function() {
    return mockSingleton;
  };

  MockHomescreenWindowManager.mTeardown = function() {
    mockSingleton.mTeardown();
  };

  var mockSingleton = {
    start: function mhwm_start() {},
    stop: function mhwm_stop() {},

    getHomescreen: function mhwm_getHomescreen(isHomeEvent) {
      return this.mHomescreenWindow;
    },

    mHomescreenWindow: null,

    ready: true,

    mTeardown: function mhl_mTeardown() {
      this.mHomescreenWindow = null;
      this.origin = 'home';
      this.ready = true;
    }
  };

  exports.MockHomescreenWindowManager = MockHomescreenWindowManager;
}(window));
