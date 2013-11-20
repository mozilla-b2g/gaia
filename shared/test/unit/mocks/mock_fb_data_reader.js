var MockFbContactsObj = function(result) {
  this.mResult = result;
};


MockFbContactsObj.prototype = {
  _getRequest: function() {
    return {
      result: this.mResult,
      set onsuccess(cb) {
        cb();
      }
    };
  },

  search: function(by, number) {
    return this._getRequest();
  },

  get: function(uid) {
    return this._getRequest();
  },

  getByPhone: function(number) {
    return this._getRequest();
  }
};


var MockFbContacts = new MockFbContactsObj();
