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

  _triggerCallback: function(successCb, errorCb) {
    if (this._errorMsg) {
      errorCb(this._errorMsg);
      return;
    }
    successCb(this._successMsg);
  },

  getAccount: function(successCb, errorCb) {
    this._call = 'getAccount';
    this._triggerCallback(successCb, errorCb);
  },

  getAssertion: function(options, successCb, errorCb) {
    this._call = 'getAssertion';
    if (this._errorMsg) {
      errorCb(this._errorMsg);
      return;
    }
    successCb(Date.now() /* fake assertion */);
  },

  resendVerificationEmail: function(email, successCb, errorCb) {
    this._email = email;
    this._call = 'resendVerificationEmail';
    this._triggerCallback(successCb, errorCb);
  },

  logout: function(successCb, errorCb) {
    this._call = 'logout';
    this._triggerCallback(successCb, errorCb);
  }
};

