'use strict';
/* exported MockCallsHandler */

var MockCallsHandler = {
  mActiveCall: null,
  mActiveCallForContactImage: null,
  mUpdateKeypadEnabledCalled: true,
  mIsFirstCallOnCdmaNetwork: false,
  mIsCdma3wayCall: false,

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

  isFirstCallOnCdmaNetwork: function() {
    return this.mIsFirstCallOnCdmaNetwork;
  },
  isCdma3WayCall: function(){
    return this.mIsCdma3wayCall;
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
    this.mIsFirstCallOnCdmaNetwork = false;
    this.mIsCdma3wayCall = false;
  }
};
