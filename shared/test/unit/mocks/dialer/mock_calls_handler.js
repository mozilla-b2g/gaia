'use strict';
/* exported MockCallsHandler */

var MockCallsHandler = {
  mActiveCall: null,
  mActiveCallForContactImage: null,
  mUpdateKeypadEnabledCalled: true,
  mIsFirstCallOnCdmaNetwork: false,

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
  }
};
