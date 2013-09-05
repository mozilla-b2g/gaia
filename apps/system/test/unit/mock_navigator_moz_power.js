'use strict';

var MockMozPower = {
  addWakeLockListener: function() {},
  cpuSleepAllowed: false,
  screenBrightness: 0,
  screenEnabled: false,

  mTeardown: function teardown() {
    this.cpuSleepAllowed = false;
    this.screenBrightness = 0;
    this.screenEnabled = false;
  }
};
