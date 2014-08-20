(function(exports) {
  'use strict';

  exports.MockFtuLauncher = {
    mIsRunning: false,
    mIsUpgrading: false,

    isFtuRunning: function() {
      return this.mIsRunning;
    },

    isFtuUpgrading: function() {
      return this.mIsUpgrading;
    },

    retrieve: function() {
    },

    getFtuOrigin: function() {
      return 'app://ftu.gaiamobile.org';
    }
  };
}(window));
