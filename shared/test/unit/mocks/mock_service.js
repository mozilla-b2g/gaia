/* exported MockService */
'use strict';
var MockService = {
  mTeardown: function() {
    this.locked = false;
    this.runningFTU = false;
    this.mUpgrading = false;
    this.mBtEnabled = false;
    this.mTopMostUI = null;
  },
  lowerCapital: function() {
    return 'a';
  },
  lazyLoad: function() {},
  register: function() {},
  unregister: function() {},
  registerState: function() {},
  unregisterState: function() {},
  request: function() {},
  query: function(state) {
    switch (state) {
      case 'isFtuRunning':
        return this.runningFTU;
      case 'isFtuUpgrading':
        return this.mUpgrading;
      case 'getTopMostWindow':
        return this.mTopMostWindow;
      case 'getTopMostUI':
        return this.mTopMostUI;
      case 'Bluetooth.isEnabled':
        return this.mBtEnabled;
      case 'getTopMostUI':
        return this.mTopMostUI;
    }
    return undefined;
  },
  mPublishEvents: {},
  isBusyLoading: function() {
    return false;
  },
  currentTime: function() {},
  locked: false,
  runningFTU: false,
  mBtEnabled: false,
  manifestURL: 'app://system.gaiamobile.org/manifest.webapp',
  currentApp: null
};
