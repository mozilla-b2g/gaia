'use strict';

var MockScreenLayout = {
  setting: {},
  setDefault: function msl_setDefault(setting) {
    for (var name in setting) {
      this.setting[name] = setting[name];
    }
  },

  getCurrentLayout: function msl_getCurrentLayout(type) {
    return this.setting[type];
  },

  mTeardown: function msl_mTeardown() {
    this.setting = {};
  }
};
