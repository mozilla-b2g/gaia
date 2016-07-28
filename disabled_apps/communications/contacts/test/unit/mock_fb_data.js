'use strict';

var MockFbContactsWriterObj = function() {
  this.storedData = Object.create(null);
  this.savedError = [];
};


MockFbContactsWriterObj.prototype = {
  _getRequest: function() {
    return {
      result: {},
      set onsuccess(cb) {
        cb();
      }
    };
  },

  _getErrorRequest: function(errorName) {
    return {
      error: {
        name: errorName
      },
      set onerror(cb) {
        cb();
      }
    };
  },

  save: function(obj) {
    if (this.storedData[obj.uid]) {
      return this._getErrorRequest('AlreadyExists');
    }

    if (this.savedError.indexOf(obj.uid) !== -1) {
      return this._getErrorRequest('DB Error');
    }

    this.storedData[obj.uid] = obj;
    return this._getRequest();
  },

  getLength: function() {
    return Object.keys(this.storedData).length;
  }
};
