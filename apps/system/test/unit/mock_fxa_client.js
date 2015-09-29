'use strict';
/* exported MockFxAccountsClient */

var MockFxAccountsClient = {
  _errorMsg: null,
  _successMsg: null,
  _call: null,
  _email: null,

  _reset: function() {
    this._call = null;
    this._errorMsg = null;
    this._successMsg = null;
    this._email = null;
  },

  _checkError: function() {
    if (this._errorMsg) {
      return Promise.reject(this._errorMsg);
    }
    return Promise.resolve(this._successMsg);
  },

  getAccount: function() {
    this._call = 'getAccount';
    return this._checkError();
  },

  getAssertion: function(options) {
    this._call = 'getAssertion';
    this._successMessage = Date.now(); // fake assertion
    return this._checkError();
  },

  resendVerificationEmail: function(email) {
    this._email = email;
    this._call = 'resendVerificationEmail';
    return this._checkError();
  },

  logout: function() {
    this._call = 'logout';
    return this._checkError();
  }
};
