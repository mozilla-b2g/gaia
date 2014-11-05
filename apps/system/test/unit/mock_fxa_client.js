'use strict';

var MockFxAccountsClient = {
  _errorMsg: null,
  _successMsg: null,
  _call: null,

  _reset: function() {
    this._call = null;
    this._errorMsg = null;
    this._successMsg = null;
  },

  _triggerCallback: function(successCb, errorCb) {
    if (this._errorMsg) {
      errorCb(this._errorMsg);
      return;
    }
    successCb(this._successMsg);
  },

  getAccounts: function(successCb, errorCb) {
    this._call = 'getAccounts';
    this._triggerCallback(successCb, errorCb);
  },

  resendVerificationEmail: function(successCb, errorCb) {
    this._call = 'resendVerificationEmail';
    this._triggerCallback(successCb, errorCb);
  },

  logout: function(successCb, errorCb) {
    this._call = 'logout';
    this._triggerCallback(successCb, errorCb);
  }
};

