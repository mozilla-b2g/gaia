var MockOnCallHandler = {
  mLastEntryAdded: null,
  mNotifyBusyLineCalled: false,

  addRecentEntry: function(entry) {
    this.mLastEntryAdded = entry;
  },

  notifyBusyLine: function notifyBusyLine() {
    this.mNotifyBusyLineCalled = true;
  },

  mTeardown: function() {
    this.mLastEntryAdded = null;
    this.mNotifyBusyLineCalled = false;
  }
};
