'use strict';

var MockScreenLayout = {
  setting: {},
  setDefault: function msl_setDefault(setting) {
    for (var name in setting) {
      this.setting[name] = setting[name];
    }
  },

  defaultOrientation: 'portrait-primary',
  fetchDefaultOrientation: function msl_fetchDefaultOrientation() {},
  isOnRealDevice: function() {
    return this.setting['isonrealdevice'];
  },
  getCurrentLayout: function msl_getCurrentLayout(type) {
    return this.setting[type];
  },

  mTeardown: function msl_mTeardown() {
    this.setting = {};
    this.defaultOrientation = 'portrait-primary';
  }
};
