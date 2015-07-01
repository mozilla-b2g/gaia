'use strict';

var MockAppWindowManager = function() {};
MockAppWindowManager.prototype = {
  isRunning: function(config) {
    return (config.origin in this.mRunningApps);
  },

  mRunningApps: {},

  // TODO: Remove this.
  getRunningApps: function mawm_getRunningApps() {
    return this.mRunningApps;
  },

  // TODO: Remove this.
  getApps: function mawm_getRunningApps() {
    return this.mRunningApps;
  },

  getActiveApp: function mawm_getActiveApp() {
    return this.mActiveApp;
  },

  getApp: function mawm_getActiveApp(origin) {
    return this.mRunningApps[origin];
  },

  getAppByURL: function mawm_getAppByUrl() {
    return null;
  },

  // reference to active appWindow instance.
  mActiveApp: null,

  slowTransition: false,

  // Switch to a different app
  display: function mawm_display(origin, callback) {
    this.mActiveApp = this.mRunningApps[origin];
  },

  kill: function mawm_kill(origin) {
    this.mLastKilledOrigin = origin;
  },

  mTeardown: function mawm_mTeardown() {
    this.mRunningApps = {};
    this.mActiveApp = null;
  },

  broadcastMessage: function() {
  },

  start: function() {}
};
