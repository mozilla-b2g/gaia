/* exported MockFxAccountsIACHelper */

'use strict';

var MockFxAccountsIACHelper = {
  getAccountNoCallback: false,
  logoutNoCallback: false,
  getAccountError: null,
  account: null,

  reset: function() {
    this.account = null;
    this.getAccountError = null;
    this.getAccountNoCallback = null;
    this.logoutNoCallback = null;
  },

  // FxAccountIACHelper API

  openFlow: function() {},

  getAccount: function(successCb, errorCb) {
    if (this.getAccountNoCallback) {
      return;
    }

    if (this.getAccountError) {
      errorCb(this.getAccountError);
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
