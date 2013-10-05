var MockCallsHandler = {
  mLastEntryAdded: null,
  mUpdateKeypadEnabledCalled: true,

  updateKeypadEnabled: function() {
    this.mUpdateKeypadEnabledCalled =
      !this.mUpdateKeypadEnabledCalled;
  },

  addRecentEntry: function(entry) {
    this.mLastEntryAdded = entry;
  },

  toggleMute: function() {},
  unmute: function() {},
  toggleSpeaker: function() {},
  turnSpeakerOn: function() {},
  turnSpeakerOff: function() {},
  checkCalls: function() {},
  mergeActiveCallWith: function() {},
  mergeConferenceGroupWithActiveCall: function() {},
  requestContactsTab: function() {},
  end: function() {},
  answer: function() {},

  mTeardown: function() {
    this.mLastEntryAdded = null;
    this.mUpdateKeypadEnabledCalled = true;
  }
};
