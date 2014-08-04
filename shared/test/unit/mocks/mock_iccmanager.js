'use strict';



var MockIccManager = function() {
  this.iccIds = [];
  this.adnContacts = [];
  this.sdnContacts = [];
  this.isAdnOnError = false;
  this.isSdnOnError = false;
};

MockIccManager.prototype.getIccById = function(id) {
  var self = this;
  return {
    'iccInfo': {
      'iccid': id
    },
    'readContacts': function(type) {
      if (type === 'adn') {
        return new MockReadContactsRequest(self.isAdnOnError, self.adnContacts);
      }
      if (type === 'sdn') {
        return new MockReadContactsRequest(self.isSdnOnError, self.sdnContacts);
      }
    }
  };
};


function MockReadContactsRequest(willFail, result) {
  this._result = result;
  this._willFail = willFail;
}

MockReadContactsRequest.prototype = {
  set onsuccess(successCb) {
    if (!this._willFail) {
      this.result = this._result;
      (typeof successCb === 'function') &&
      successCb();
    }
  },
  set onerror(errorCb) {
    if (this._willFail) {
      this.error = { name: 'error' };
      (typeof errorCb === 'function') &&
      errorCb();
    }
  }
};
