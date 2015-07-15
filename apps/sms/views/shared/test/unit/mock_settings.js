(function(exports) {
'use strict';

var MockSettings = {
  SERVICE_ID_KEYS: {
    mmsServiceId: 'ril.mms.defaultServiceId',
    smsServiceId: 'ril.sms.defaultServiceId'
  },
  mmsSizeLimitation: 295 * 1024,
  maxConcatenatedMessages: 10,
  mmsServiceId: null,
  smsServiceId: null,
  supportEmailRecipient: false,
  init: () => {},
  switchMmsSimHandler: function() {},
  isDualSimDevice: function() { return false; },
  hasSeveralSim: function() { return false; },
  getServiceIdByIccId: function() { return null; },
  setReadAheadThreadRetrieval: function() {},

  mSetup: function() {
    MockSettings.mmsSizeLimitation = 295 * 1024;
    MockSettings.maxConcatenatedMessages = 10;
    MockSettings.mmsServiceId = null;
    MockSettings.smsServiceId = null;
    MockSettings.supportEmailRecipient = false;
  }
};

exports.MockSettings = MockSettings;

}(this));
