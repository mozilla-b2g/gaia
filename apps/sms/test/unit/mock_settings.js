(function(exports) {
'use strict';

var MockSettings = {
  mmsSizeLimitation: 300 * 1024,
  mmsServiceId: null,
  nonActivateMmsServiceIds: [],
  setSimServiceId: function() {},
  switchSimHandler: function() {},
  whenReady: function() { return Promise.resolve(); },
  isDoubleSim: function() { return false; },

  mSetup: function() {
    MockSettings.mmsSizeLimitation = 300 * 1024;
    MockSettings.mmsServiceId = null;
    MockSettings.nonActivateMmsServiceIds = [];
  }
};

exports.MockSettings = MockSettings;

}(this));
