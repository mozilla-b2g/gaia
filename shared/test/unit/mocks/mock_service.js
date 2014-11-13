/* exported MockService */
'use strict';
var MockService = {
  mTeardown: function() {
    this.runningFTU = false;
    this.mUpgrading = false;
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
  manifestURL: 'app://system.gaiamobile.org/manifest.webapp',
  currentApp: null
};
