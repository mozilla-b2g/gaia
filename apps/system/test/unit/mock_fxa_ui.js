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

  _triggerCallback: function(successCb, errorCb) {
    if (this._errorMsg) {
      errorCb(this._errorMsg);
      return;
    }
    successCb(this._successMsg);
  },

  login: function(successCb, errorCb) {
    this._call = 'login';
    this._triggerCallback(successCb, errorCb);
  },

  refreshAuthentication: function(email, successCb, errorCb) {
    this._call = 'refreshAuthentication';
    this._email = 'dummy@domain.org';
    this._triggerCallback(successCb, errorCb);
  }
};
