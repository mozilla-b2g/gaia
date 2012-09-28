var MockContacts = {
  findByNumber: function findByNumber(number, callback) {
    this.mCalledWith = number;
    this.mPhoto = 'test';
    this.mName = 'test name';

    var tel = {
      value: this.mCalledWith,
      carrier: this.mCarrier,
      type: this.mType
    };
    callback({
      name: [this.mName],
      tel: [tel],
      photo: [this.mPhoto]
    }, tel);
  },
  mPhoto: null,
  mName: null,
  mCalledWith: null,
  mCarrier: 'carrier',
  mType: 'type',
  mTearDown: function tearDown() {
    this._calledWith = null;
    this.mCarrier = 'carrier';
    this.mType = 'type';
  }
};

