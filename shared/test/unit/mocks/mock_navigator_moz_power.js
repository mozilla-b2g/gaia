'use strict';
/* exported MockMozPower */

var MockMozPower = {
  addWakeLockListener: function() {},
  cpuSleepAllowed: false,
  screenBrightness: 0,
  screenEnabled: false,
  keyLightEnabled: false,
  powerOff: function() {},
  reboot: function() {},
  factoryReset: function() {},
  mTeardown: function teardown() {
    this.cpuSleepAllowed = false;
    this.screenBrightness = 0;
    this.screenEnabled = false;
  }
};
