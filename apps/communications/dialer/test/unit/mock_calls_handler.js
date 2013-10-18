var MockCallsHandler = {
  mActiveCall: null,
  mLastEntryAdded: null,
  mUpdateKeypadEnabledCalled: true,

  updateKeypadEnabled: function() {
    this.mUpdateKeypadEnabledCalled =
      !this.mUpdateKeypadEnabledCalled;
  },

  addRecentEntry: function(entry) {
    this.mLastEntryAdded = entry;
  },

  get activeCall() {
    return this.mActiveCall;
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
  requestContactsTab: function() {},
  end: function() {},
  answer: function() {},

  mTeardown: function() {
    this.mActiveCall = null;
    this.mLastEntryAdded = null;
    this.mUpdateKeypadEnabledCalled = true;
  }
};
