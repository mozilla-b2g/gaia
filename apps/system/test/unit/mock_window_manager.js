var MockWindowManager = {
  getDisplayedApp: function mwm_getDisplayedApp() {
    return this.mDisplayedApp;
  },

  getRunningApps: function mwm_getRunningApps() {
    return this.mRunningApps;
  },

  setDisplayedApp: function mwm_setDisplayedApp(app) {
    this.mDisplayedApp = app;
  },

  getCurrentDisplayedApp: function mwm_getCurrentDisplayedApp() {
    return this.mDisplayedApp;
  },

  getOrientationForApp: function(origin) {
    var app = this.mRunningApps[origin];

    if (!app || !app.manifest)
      return;

    return app.manifest.orientation;
  },

  launch: function mwm_launch(origin) {
    this.mDisplayedApp[origin] = {
      origin: origin
    };
    this.setDisplayedApp(origin);
  },

  kill: function mwm_kill(origin) {
    this.mLastKilledOrigin = origin;
  },

  screenshots: {},

  mRunningApps: {},
  mDisplayedApp: '',
  mLastKilledOrigin: '',
  isFtuRunning: function mwm_isFtuRunning() {
    return this.mFtuRunning;
  },

  mFtuRunning: false,
  mTeardown: function() {
    this.mRunningApps = {};
    this.mDisplayedApp = '';
    this.mLastKilledOrigin = '';
    this.mFtuRunning = false;
  }
};
