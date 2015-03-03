(function(exports) {
  'use strict';

  exports.MockFtuLauncher = {
    mIsRunning: false,
    mIsUpgrading: false,
    mReadyRightAway: false,
    mTeardown: function() {
      this.mIsRunning = false;
      this.mIsUpgrading = false;
      this.mReadyRightAway = false;
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
      return new Promise(function(resolve) {
        if (this.mReadyRightAway) {
          resolve();
        }
      }.bind(this));
    }
  };
}(window));
