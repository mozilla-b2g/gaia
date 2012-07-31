var MockRecents = {
  add: function(entry) {
    this.mCalledWith = entry;
  },

  mCalledWith: null,
  mTearDown: function tearDown() {
    this._calledWith = null;
  }
};
