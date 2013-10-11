var MockWindowManager = {
  getDisplayedApp: function mwm_getDisplayedApp() {
    return this.mDisplayedApp;
  },

  getRunningApps: function mwm_getRunningApps() {
    return this.mRunningApps;
  },

  getCachedScreenshotForApp: function mwm_getCachedScreenshotForApp(origin) {
    return this.mScreenshots[origin];
  },

  setDisplayedApp: function mwm_setDisplayedApp(app) {
    this.mDisplayedApp = app;
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
  mScreenshots: {},
  mDisplayedApp: '',
  mLastKilledOrigin: '',
  isFtuRunning: function mwm_isFtuRunning() {
    return this.mFtuRunning;
  },

  mFtuRunning: false,
  mTeardown: function() {
    this.mRunningApps = {};
    this.mScreenshots = {};
    this.mDisplayedApp = '';
    this.mLastKilledOrigin = '';
    this.mFtuRunning = false;
  }
};
