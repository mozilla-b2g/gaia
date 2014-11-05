'use strict';

(function(exports) {
  var mHomescreenInstance;

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
      this.origin = options.origin || 'home';
      this.ready = options.ready;
      this.manifestURL = options.manifestURL ||
                         'app://fakehome.gaiamobile.org/manifest.webapp';
    },

    mHomescreenWindow: null,

    origin: 'home',
    manifestURL: 'app://fakehome.gaiamobile.org/manifest.webapp',

    ready: true,

    mTeardown: function mhl_mTeardown() {
      this.mHomescreenWindow = null;
      this.origin = 'home';
      this.manifestURL = 'app://fakehome.gaiamobile.org/manifest.webapp';
      this.ready = true;
    }
  };

  exports.MockHomescreenLauncher = MockHomescreenLauncher;
}(window));
