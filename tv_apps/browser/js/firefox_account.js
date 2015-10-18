/* exported FirefoxAccount */
/* global FxAccountsIACHelper */
/* global SyncManagerBridge */

'use strict';

(function (exports) {

  function FirefoxAccount (options) {
    this.email = '';
    this.VERIFIED = false;

    this.syncBookmarks = options.syncBookmarks || true;
    this.syncHistory = options.syncHistory || false;
    this.syncPasswords = options.syncPasswords || false;
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
    function firefoxAccount_openFlow (onFinish) {
      FxAccountsIACHelper.openFlow((e) => {
        this.onStatusChange(e);
        onFinish();
      }, this.onStatusError.bind(this));
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
    return SyncManagerBridge.enable();
  };

  FirefoxAccount.prototype.setSyncSettings =
    function firefoxAccount_setSyncSettings (settings) {
      this.syncBookmarks = settings.syncBookmarks;
      this.syncHistory = settings.syncHistory;
      this.syncPasswords = settings.syncPasswords;
      this.syncTab = settings.syncTab;

      var promise = new Promise((resolve, reject) => {
        var lock = navigator.mozSettings.createLock();
        var result = lock.set({
          'sync.collections.bookmarks.enabled': this.syncBookmarks,
          'sync.collections.history.enabled': this.syncHistory,
          'sync.collections.passwords.enabled': this.syncPasswords
        });

        result.onsuccess = function () {
          resolve();
        };

        result.onerror = function () {
          reject(result.error);
        };
      });

      return promise;
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
        this.VERIFIED = false;
        if (this.onlogout) {
          this.onlogout(e);
        }
      } else if (e.verified) {
        this.VERIFIED = true;
        if (this.onverified) {
          this.onverified(e);
        }
      } else if (!e.verified) {
        this.VERIFIED = false;
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
