(function(exports) {
'use strict';

var MockSettings = {
  SERVICE_ID_KEYS: {
    mmsServiceId: 'ril.mms.defaultServiceId',
    smsServiceId: 'ril.sms.defaultServiceId'
  },
  mmsSizeLimitation: 300 * 1024,
  mmsServiceId: null,
  smsServiceId: null,
  switchMmsSimHandler: function() {},
  isDualSimDevice: function() { return false; },
  hasSeveralSim: function() { return false; },
  getServiceIdByIccId: function() { return 0; },
  getSimNameByIccId: function(id) { return 'sim-name-' + id; },
  getOperatorByIccId: function(id) { return 'sim-operator-' + id; },

  mSetup: function() {
    MockSettings.mmsSizeLimitation = 300 * 1024;
    MockSettings.mmsServiceId = null;
    MockSettings.smsServiceId = null;
  }
};

exports.MockSettings = MockSettings;

}(this));
