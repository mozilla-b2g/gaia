/* exported FirefoxAccount */
/* global FxAccountsIACHelper */

'use strict';

(function (exports) {

  function FirefoxAccount (options) {
    this.email = '';

    this.syncBookmark = options.syncBookmark || true;
    this.syncHistory = options.syncHistory || false;
    this.syncPassword = options.syncPassword || false;
    this.syncTab = options.syncTab || false;

    this.onlogin = options.onlogin && typeof options.onlogin === 'function' ?
                   options.onlogin : null;
    this.onverified = options.onverified &&
                      typeof options.onverified === 'function' ?
                        options.onverified : null;
    this.onlogout = options.onlogout && typeof options.onlogout === 'function' ?
                    options.onlogout : null;
    this.onerror = options.onerror && typeof options.onerror === 'function' ?
                    options.onerror : null;

    this.init();
  }

  FirefoxAccount.prototype.init = function firefoxAccount_init () {
    this.refreshStatus();
    document.addEventListener('visibilitychange',
      this.onVisibilityChange.bind(this));
  };

  FirefoxAccount.prototype.openFlow =
    function firefoxAccount_openFlow () {
      FxAccountsIACHelper.openFlow(this.onStatusChange.bind(this),
                                   this.onStatusError.bind(this));
  };

  FirefoxAccount.prototype.resendEmail =
    function firefoxAccount_resendEmail (onResend) {
      FxAccountsIACHelper.getAccount(function (account) {
        var email = account && account.email;
        if (!email) {
          return this.onStatusChange(account);
        }
        FxAccountsIACHelper.resendVerificationEmail(email,
          function () {
            onResend(email);
          }, this.onStatusError.bind(this));
      }.bind(this), this.onStatusError.bind(this));
  };

  FirefoxAccount.prototype.signOut = function firefoxAccount_signOut () {
    // XXX: Implement sign out
  };

  FirefoxAccount.prototype.sync = function firefoxAccount_sync () {
    // XXX: Implement sync
  };

  FirefoxAccount.prototype.setSyncSettings =
    function firefoxAccount_setSyncSettings (settings) {
      this.syncbookmark = settings.syncBookmark;
      this.synchistory = settings.syncHistory;
      this.syncpassword = settings.syncPassword;
      this.synctab = settings.syncTab;
  };

  FirefoxAccount.prototype.refreshStatus =
    function firefoxAccount_refreshStatus () {
      FxAccountsIACHelper.getAccount(this.onStatusChange.bind(this),
                                      this.onStatusError.bind(this));
  };

  // if e == null, user is logged out.
  // if e.verified, user is logged in & verified.
  // if !e.verified, user is logged in & unverified.
  FirefoxAccount.prototype.onStatusChange =
    function firefoxAccount_onStatusChange (e) {
      console.log('On firefox account status change', e);
      this.email = e ? e.email : '';

      if (!e) {
        if (this.onlogout) {
          this.onlogout(e);
        }
      } else if (e.verified) {
        if (this.onverified) {
          this.onverified(e);
        }
      } else if (!e.verified) {
        if (this.onlogin) {
          this.onlogin(e);
        }
      }
  };

  FirefoxAccount.prototype.onStatusError =
    function firefoxAccount_onStatusError (e) {
      console.error('Error getting Firefox Account: ', e.error);
      if (this.onerror) {
        this.onerror(e);
      }
  };

  FirefoxAccount.prototype.onVisibilityChange =
    function firefoxAccount_onVisibilityChange () {
      if (document.hidden) {
        FxAccountsIACHelper.removeEventListener('onlogin',
          this.refreshStatus.bind(this));
        FxAccountsIACHelper.removeEventListener('onverified',
          this.refreshStatus.bind(this));
        FxAccountsIACHelper.removeEventListener('onlogout',
          this.refreshStatus.bind(this));
      } else {
        FxAccountsIACHelper.addEventListener('onlogin',
          this.refreshStatus.bind(this));
        FxAccountsIACHelper.addEventListener('onverified',
          this.refreshStatus.bind(this));
        FxAccountsIACHelper.addEventListener('onlogout',
          this.refreshStatus.bind(this));
        this.refreshStatus();
      }
  };

  exports.FirefoxAccount = FirefoxAccount;

})(window);
