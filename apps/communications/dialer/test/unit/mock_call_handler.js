var MockOnCallHandler = {
  mLastEntryAdded: null,

  addRecentEntry: function(entry) {
    this.mLastEntryAdded = entry;
  },

  mTeardown: function() {
    this.mLastEntryAdded = null;
  }
};
