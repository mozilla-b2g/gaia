/* exported MockFxAccountsIACHelper */

'use strict';

var MockFxAccountsIACHelper = {
  getAccountsNoCallback: false,
  logoutNoCallback: false,
  getAccountsError: null,
  account: null,

  reset: function() {
    this.account = null;
    this.getAccountsError = null;
    this.getAccountsNoCallback = null;
    this.logoutNoCallback = null;
  },

  // FxAccountIACHelper API

  openFlow: function() {},

  getAccount: function(successCb, errorCb) {
    if (this.getAccountsNoCallback) {
      return;
    }

    if (this.getAccountsError) {
      errorCb(this.getAccountsError);
      return;
    }

    successCb(this.account);
  },

  logout: function(successCb) {
    if (!this.logoutNoCallback) {
      successCb();
    }
  }
};
