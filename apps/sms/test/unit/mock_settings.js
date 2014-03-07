(function(exports) {
'use strict';

var MockSettings = {
  mmsSizeLimitation: 300 * 1024,
  mmsServiceId: null,
  nonActivateMmsServiceIds: [],
  setSimServiceId: function() {},
  switchSimHandler: function() {},
  isDualSimDevice: function() { return false; },
  hasSeveralSim: function() { return false; },
  getSimNameByIccId: function(id) { return 'sim-name-' + id; },
  getOperatorByIccId: function(id) { return 'sim-operator-' + id; },

  mSetup: function() {
    MockSettings.mmsSizeLimitation = 300 * 1024;
    MockSettings.mmsServiceId = null;
    MockSettings.nonActivateMmsServiceIds = [];
  }
};

exports.MockSettings = MockSettings;

}(this));
