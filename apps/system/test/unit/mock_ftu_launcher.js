(function(exports) {
  'use strict';

  exports.MockFtuLauncher = {
    name: 'FtuLauncher',
    mIsRunning: false,
    mIsUpgrading: false,
    mTeardown: function() {
      this.mIsRunning = false;
      this.mIsUpgrading = false;
    },

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
    },

    respondToHierarchyEvent: function() {},

    stepReady: function() {
    }
  };
}(window));
