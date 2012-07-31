var MockContacts = {
  findByNumber: function findByNumber(number, callback) {
    this.mCalledWith = number;
    callback(null);
  },

  mCalledWith: null,
  mTearDown: function tearDown() {
    this._calledWith = null;
  }
};

