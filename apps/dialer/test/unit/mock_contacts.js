var Contacts = {
  _calledWith: null,
  findByNumber: function findByNumber(number, callback) {
    this._calledWith = number;
    callback(null);
  }
};

