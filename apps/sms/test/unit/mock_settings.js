(function(exports) {
'use strict';

var MockSettings = {
  mmsSizeLimitation: 300 * 1024,
  mmsServiceId: null,
  setSimServiceId: function() {},
  switchSimHandler: function() {},
  isDualSimDevice: function() { return false; },
  hasSeveralSim: function() { return false; },
  getServiceIdByIccId: function() { return 0; },
  getSimNameByIccId: function(id) { return 'sim-name-' + id; },
  getOperatorByIccId: function(id) { return 'sim-operator-' + id; },

  mSetup: function() {
    MockSettings.mmsSizeLimitation = 300 * 1024;
    MockSettings.mmsServiceId = null;
  }
};

exports.MockSettings = MockSettings;

}(this));
