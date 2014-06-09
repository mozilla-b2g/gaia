'use strict';
/* exported MockCallsHandler */

var MockCallsHandler = {
  mActiveCall: null,
  mActiveCallForContactImage: null,
  mUpdateKeypadEnabledCalled: true,
  mIsCdmaNetwork: false,

  updateKeypadEnabled: function() {
    this.mUpdateKeypadEnabledCalled =
      !this.mUpdateKeypadEnabledCalled;
  },

  get activeCall() {
    return this.mActiveCall;
  },

  get activeCallForContactImage() {
    return this.mActiveCallForContactImage;
  },

  isCdmaNetwork: function() {
    return this.mIsCdmaNetwork;
  },

  toggleCalls: function() {},
  toggleMute: function() {},
  unmute: function() {},
  toggleSpeaker: function() {},
  switchToSpeaker: function() {},
  switchToDefaultOut: function() {},
  switchToReceiver: function() {},
  checkCalls: function() {},
  mergeActiveCallWith: function() {},
  mergeConferenceGroupWithActiveCall: function() {},
  end: function() {},
  answer: function() {},
  updateAllPhoneNumberDisplays: function() {},

  mTeardown: function() {
    this.mActiveCall = null;
    this.mActiveCallForContactImage = null;
    this.mUpdateKeypadEnabledCalled = true;
    this.mIsCdmaNetwork = false;
  }
};
