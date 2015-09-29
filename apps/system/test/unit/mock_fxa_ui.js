'use strict';
/* exported MockFxAccountsUI */

var MockFxAccountsUI = {
  _errorMsg: null,
  _successMsg: null,
  _call: null,
  _email: null,

  _reset: function() {
    this._call = null;
    this._email = null;
    this._errorMsg = null;
    this._successMsg = null;
  },

  _checkError: function(resolve, reject) {
    if (this._errorMsg) {
      reject(this._errorMsg);
      return;
    }
    resolve(this._successMsg);
  },

  login: function() {
    return new Promise((resolve, reject) => {
      this._call = 'login';
      this._checkError(resolve, reject);
    });
  },

  refreshAuthentication: function(email) {
    return new Promise((resolve, reject) => {
      this._call = 'refreshAuthentication';
      this._email = 'dummy@domain.org';
      this._checkError(resolve, reject);
    });
  }
};
