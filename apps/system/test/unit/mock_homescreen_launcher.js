'use strict';

(function(exports) {
  var mHomescreenInstance;
  var mOrigin;
  var mReady;

  var MockHomescreenLauncher = function() {
    return this;
  };

  MockHomescreenLauncher.prototype = {
    start: function mhl_start() {},

    getHomescreen: function mhl_getHomescreen() {
      return mHomescreenInstance;
    },

    mFeedFixtures: function mhl_feedFixtures(options) {
      mHomescreenInstance = options.mHomescreenWindow;
      mOrigin = options.origin || 'home';
      mReady = options.ready;
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

  exports.MockHomescreenLauncher = MockHomescreenLauncher;
}(window));
