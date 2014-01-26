'use strict';
/* exported MockRocketbarLauncher */

var MockRocketbarLauncher = {
  show: function() {},

  enabled: true,

  triggerWidth: 0.65,

  origin: 'rocketbar',

  mTeardown: function() {
    this.origin = 'rocketbar';
  }
};
