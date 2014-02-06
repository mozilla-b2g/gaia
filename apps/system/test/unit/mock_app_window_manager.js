'use strict';

var MockAppWindowManager = {
  // backward compatibility to WindowManager
  mDisplayedApp: null,

  isRunning: function(config) {
    return (config.origin in this.mRunningApps);
  },

  mRunningApps: {},

  // TODO: Remove this.
  getRunningApps: function mawm_getRunningApps() {
    return this.mRunningApps;
  },

  getDisplayedApp: function mawm_getDisplayedApp() {
    return this.mDisplayedApp;
  },

  getActiveApp: function mawm_getActiveApp() {
    return this.mActiveApp;
  },

  // reference to active appWindow instance.
  mActiveApp: null,

  // Switch to a different app
  display: function mawm_display(origin, callback) {
    this.displayedApp = origin;
  },

  kill: function mawm_kill(origin) {
    this.mLastKilledOrigin = origin;
  },

  mTeardown: function mawm_mTeardown() {
    this.mDisplayedApp = null;
    this.mRunningApps = {};
    this.mActiveApp = null;
  },

  broadcastMessage: function() {
  }
};
