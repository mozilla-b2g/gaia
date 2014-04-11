var MockCallsHandler = {
  mActiveCall: null,
  mUpdateKeypadEnabledCalled: true,

  updateKeypadEnabled: function() {
    this.mUpdateKeypadEnabledCalled =
      !this.mUpdateKeypadEnabledCalled;
  },

  get activeCall() {
    return this.mActiveCall;
  },

  toggleCalls: function() {},
  toggleMute: function() {},
  unmute: function() {},
  toggleSpeaker: function() {},
  turnSpeakerOn: function() {},
  turnSpeakerOff: function() {},
  checkCalls: function() {},
  mergeActiveCallWith: function() {},
  mergeConferenceGroupWithActiveCall: function() {},
  end: function() {},
  answer: function() {},
  updateAllPhoneNumberDisplays: function() {},

  mTeardown: function() {
    this.mActiveCall = null;
    this.mUpdateKeypadEnabledCalled = true;
  }
};
