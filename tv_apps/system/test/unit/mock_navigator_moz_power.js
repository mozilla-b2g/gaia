'use strict';
/* exported MockMozPower */

var MockMozPower = {
  addWakeLockListener: function() {},
  cpuSleepAllowed: false,
  screenBrightness: 0,
  screenEnabled: false,
  powerOff: function() {},
  reboot: function() {},
  mTeardown: function teardown() {
    this.cpuSleepAllowed = false;
    this.screenBrightness = 0;
    this.screenEnabled = false;
  }
};
