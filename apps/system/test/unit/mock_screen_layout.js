'use strict';

var MockScreenLayout = {
  setting: {},
  setDefault: function msl_setDefault(setting) {
    for (var name in setting) {
      this.setting[name] = setting[name];
    }
  },

  isOnRealDevice: function msl_isOnRealDevice() {
    return this.setting['isonrealdevice'];
  },

  getCurrentLayout: function msl_getCurrentLayout(type) {
    return this.setting[type];
  },

  mTeardown: function msl_mTeardown() {
    this.setting = {};
  }
};
