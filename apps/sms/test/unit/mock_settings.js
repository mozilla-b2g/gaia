(function(exports) {
'use strict';

var MockSettings = {
  mmsSizeLimitation: 300 * 1024,
  mmsServiceId: 0,
  nonActivateMmsServiceIds: [1],
  setSimServiceId: function() {},
  switchSimHandler: function() {},

  mSetup: function() {
    MockSettings.mmsSizeLimitation = 300 * 1024;
    MockSettings.mmsServiceId = 0;
  }
};

exports.MockSettings = MockSettings;

}(this));
