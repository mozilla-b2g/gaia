'use strict';

define(function(require) {
  var normalizer = require('shared/text_normalizer');
  var fxaHelper = require('shared/fxa_iac_client');
  var dialogService = require('modules/dialog_service');

  var FirefoxAccounts = function() {
    this._boundRefreshStatus =
      this._boundRefreshStatus || this.refreshStatus.bind(this);
  };

  FirefoxAccounts.prototype = {
    onInit: function fxa_init(elements) {
      this._elements = elements;
    },

    onBeforeShow: function fxa_beforeShow() {
      fxaHelper.addEventListener('onlogin', this._boundRefreshStatus);
      fxaHelper.addEventListener('onverified', this._boundRefreshStatus);
      fxaHelper.addEventListener('onlogout', this._boundRefreshStatus);
      this._boundRefreshStatus();
    },

    onBeforeHide: function fxa_beforeHide() {
      fxaHelper.removeEventListener('onlogin', this._boundRefreshStatus);
      fxaHelper.removeEventListener('onverified', this._boundRefreshStatus);
      fxaHelper.removeEventListener('onlogout', this._boundRefreshStatus);
    },

    refreshStatus: function fxa_refreshStatus() {
      fxaHelper.getAccount(
        this._onFxAccountStateChange.bind(this),
        this._onFxAccountError.bind(this));
    },

    // if e == null, user is logged out.
    // if e.verified, user is logged in & verified.
    // if !e.verified, user is logged in & unverified.
    _onFxAccountStateChange: function fxa_onFxAccountStateChange(e) {
      var email = e ? normalizer.escapeHTML(e.email) : '';
      if (!e) {
        this._hideLoggedInPanel();
        this._hideUnverifiedPanel();
        this._showLoggedOutPanel();
      } else if (e.verified) {
        this._hideLoggedOutPanel();
        this._hideUnverifiedPanel();
        this._showLoggedInPanel(email);
      } else {
        this._hideLoggedOutPanel();
        this._hideLoggedInPanel();
        this._showUnverifiedPanel(email);
      }
    },

    _onFxAccountError: function fxa_onFxAccountError(err) {
      console.error('FxaPanel: Error getting Firefox Account: ' + err.error);
    },

    _hideLoggedOutPanel: function fxa_hideLoggedOutPanel() {
      this._elements.loginBtn.onclick = null;
      this._elements.loggedOutPanel.hidden = true;
    },

    _showLoggedOutPanel: function fxa_showLoggedOutPanel() {
      this._elements.loginBtn.onclick = this._onLoginClick.bind(this);
      this._elements.loggedOutPanel.hidden = false;
    },

    _hideLoggedInPanel: function fxa_hideLoggedInPanel() {
      this._elements.loggedInPanel.hidden = true;
      this._elements.loggedInEmail.textContent = '';
      this._elements.logoutBtn.onclick = null;
    },

    _showLoggedInPanel: function fxa_showLoggedInPanel(email) {
      document.l10n.setAttributes(
        this._elements.loggedInEmail, 'fxa-logged-in-text', {
        email: email
      });
      this._elements.loggedInPanel.hidden = false;
      this._elements.logoutBtn.onclick = this._onLogoutClick.bind(this);
    },

    _hideUnverifiedPanel: function fxa_hideUnverifiedPanel() {
      this._elements.unverifiedPanel.hidden = true;
      this._elements.unverifiedEmail.textContent = '';
      this._elements.cancelBtn.onclick = null;
      if (this._elements.resendLink) {
        this._elements.resendLink.onclick = null;
      }
    },

    _showUnverifiedPanel: function fxa_showUnverifiedPanel(email) {
      this._elements.unverifiedPanel.hidden = false;
      this._elements.cancelBtn.onclick = this._onLogoutClick.bind(this);
      document.l10n.setAttributes(
        this._elements.unverifiedEmail,
        'fxa-verification-email-sent-msg',
        {email: email}
      );
      this._elements.resendLink.onclick = this._onResendClick.bind(this);
    },

    _onLogoutClick: function fxa_onLogoutClick(e) {
      e.stopPropagation();
      e.preventDefault();
      fxaHelper.logout(
        this._onFxAccountStateChange.bind(this),
        this._onFxAccountError.bind(this));
    },

    _onResendClick: function fxa__onResendClick(e) {
      e.stopPropagation();
      e.preventDefault();
      if (e.target.classList.contains('disabled')) {
        return;
      }
      fxaHelper.getAccount((accts) => {
        var email = accts && accts.email;
        if (!email) {
          return this._onFxAccountStateChange(accts);
        }
        fxaHelper.resendVerificationEmail(
          email, this._onResend.bind(this, email),
            this._onFxAccountError.bind(this));
      }, this._onFxAccountError.bind(this));
    },

    _onResend: function fxa__onResend(email) {
      dialogService.alert({
        id: 'fxa-resend-alert',
        args: { email: email }
      });
      // disable link for 60 seconds, then reenable
      this._elements.resendLink.classList.add('disabled');
      setTimeout(() => {
        this._elements.resendLink.classList.remove('disabled');
      }, 60000);
    },

    _onLoginClick: function fxa_onLoginClick(e) {
      e.stopPropagation();
      e.preventDefault();
      fxaHelper.openFlow(
        this._onFxAccountStateChange.bind(this),
        this._onFxAccountError.bind(this));
    }
  };

  return function ctor_firefox_accounts() {
    return new FirefoxAccounts();
  };
});
