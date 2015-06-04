'use strict';
/* exported MockCallsHandler */

var MockCallsHandler = {
  mActiveCall: null,
  mActiveCallForContactImage: null,
  mIsFirstCallOnCdmaNetwork: false,

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
  end: function() {},
  answer: function() {},
  updateAllPhoneNumberDisplays: function() {},
  updatePlaceNewCall: function() {},
  mergeCalls: function() {},
  holdOrResumeSingleCall: function() {},
  updateMergeAndOnHoldStatus: function() {},
  updateMuteAndSpeakerStatus: function() {},
  setup: function () {},

  mTeardown: function() {
    this.mActiveCall = null;
    this.mActiveCallForContactImage = null;
    this.mIsFirstCallOnCdmaNetwork = false;
  }
};
