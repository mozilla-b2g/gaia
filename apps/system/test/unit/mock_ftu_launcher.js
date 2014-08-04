'use strict';

var MockFtuLauncher = {
  mIsRunning: false,

  isFtuRunning: function() {
    return this.mIsRunning;
  },

  retrieve: function() {
  },

  getFtuOrigin: function() {
    return 'app://ftu.gaiamobile.org';
  }
};
