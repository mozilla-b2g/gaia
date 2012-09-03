var MockContacts = {
  findByNumber: function findByNumber(number, callback) {
    this.mCalledWith = number;
    this.mPhoto = 'test';
    this.mName = 'test name';
    callback({
      name: [this.mName],
      tel: [{
        value: this.mCalledWith
      }],
      photo: [this.mPhoto]
    });
  },
  mPhoto: null,
  mName: null,
  mCalledWith: null,
  mTearDown: function tearDown() {
    this._calledWith = null;
  }
};

