var MockFbContactsObj = function(result, inError) {
  this.mResult = result;
  this.inError = inError;
};


MockFbContactsObj.prototype = {
  _getRequest: function() {
    if (this.inError === true) {
      return {
        error: {
          name: 'UnknownError'
        },
        set onerror(cb) {
          window.setTimeout(function() {
            cb({
                target: this
            });
          });
        }
      };
    }
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
