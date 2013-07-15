var MockOnCallHandler = {
  mLastEntryAdded: null,
  mNotifyBusyLineCalled: false,
  mUpdateKeypadEnabledCalled: true,

  updateKeypadEnabled: function() {
    this.mUpdateKeypadEnabledCalled =
      !this.mUpdateKeypadEnabledCalled;
  },

  addRecentEntry: function(entry) {
    this.mLastEntryAdded = entry;
  },

  notifyBusyLine: function notifyBusyLine() {
    this.mNotifyBusyLineCalled = true;
  },

  mTeardown: function() {
    this.mLastEntryAdded = null;
    this.mNotifyBusyLineCalled = false;
    this.mUpdateKeypadEnabledCalled = true;
  }
};
