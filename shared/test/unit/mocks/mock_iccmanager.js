'use strict';



var MockIccManager = function() {
  this.iccIds = [];
  this.adnContacts = [];
  this.sdnContacts = [];
  this.isAdnOnError = false;
  this.isSdnOnError = false;
  this.async = false;
};

MockIccManager.prototype.getIccById = function(id) {
  var self = this;
  return {
    'iccInfo': {
      'iccid': id
    },
    'readContacts': function(type) {
      if (type === 'adn') {
        return new MockReadContactsRequest(self.isAdnOnError, self.adnContacts,
                                           self.async);
      }
      if (type === 'sdn') {
        return new MockReadContactsRequest(self.isSdnOnError, self.sdnContacts,
                                           self.async);
      }
    }
  };
};


function MockReadContactsRequest(willFail, result, async) {
  this._result = result;
  this._willFail = willFail;
  this._async = async;
}

MockReadContactsRequest.prototype = {
  set onsuccess(successCb) {
    var self = this;

    if (!this._willFail) {
      this.result = this._result;
      if (typeof successCb === 'function') {
        if (this._async) {
          setTimeout(function() {
            successCb({ target: self });
          });
        } else {
          successCb({ target: this });
        }
      }
    }
  },
  set onerror(errorCb) {
    var self = this;

    if (this._willFail) {
      this.error = { name: 'error' };
      if (typeof errorCb === 'function') {
        if (this._async) {
          setTimeout(function() {
            errorCb(self.error);
          });
        } else {
          errorCb(this.error);
        }
      }
    }
  }
};
