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

  mTeardown: function() {
    this.mLastEntryAdded = null;
    this.mUpdateKeypadEnabledCalled = true;
  }
};
