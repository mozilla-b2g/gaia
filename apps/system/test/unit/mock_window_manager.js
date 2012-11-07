var MockWindowManager = {
  getDisplayedApp: function mwm_getDisplayedApp() {
    return this.mDisplayedApp;
  },

  kill: function mwm_kill(origin) {
    this.mLastKilledOrigin = origin;
  },

  mDisplayedApp: '',
  mLastKilledOrigin: '',
  mTearDown: function() {
    this.mDisplayedApp = '';
    this.mLastKilledOrigin = '';
  }
};
