/* global Normalizer */
/* exported FxaPanel */

'use strict';

var FxaPanel = (function fxa_panel() {
  var _ = navigator.mozL10n.get,
    fxaContainer,
    loggedOutPanel,
    loggedInPanel,
    unverifiedPanel,
    cancelBtn,
    loginBtn,
    logoutBtn,
    loggedInEmail,
    unverifiedEmail,
    resendEmail,
    resendLink,
    fxaHelper;

  function init(fxAccountsIACHelper) {
    // allow mock to be passed in for unit testing
    fxaHelper = fxAccountsIACHelper;
    fxaContainer = document.getElementById('fxa');
    loggedOutPanel = document.getElementById('fxa-logged-out');
    loggedInPanel = document.getElementById('fxa-logged-in');
    unverifiedPanel = document.getElementById('fxa-unverified');
    resendEmail = document.getElementById('fxa-resend-email');
    cancelBtn = document.getElementById('fxa-cancel-confirmation');
    loginBtn = document.getElementById('fxa-login');
    logoutBtn = document.getElementById('fxa-logout');
    loggedInEmail = document.getElementById('fxa-logged-in-text');
    unverifiedEmail = document.getElementById('fxa-unverified-text');

    // listen for changes
    onVisibilityChange();
    // start by checking current status
    refreshStatus();
    document.addEventListener('visibilitychange', onVisibilityChange);
  }

  function onVisibilityChange() {
    if (document.hidden) {
      fxaHelper.removeEventListener('onlogin', refreshStatus);
      fxaHelper.removeEventListener('onverifiedlogin', refreshStatus);
      fxaHelper.removeEventListener('onlogout', refreshStatus);
    } else {
      fxaHelper.addEventListener('onlogin', refreshStatus);
      fxaHelper.addEventListener('onverifiedlogin', refreshStatus);
      fxaHelper.addEventListener('onlogout', refreshStatus);
    }
  }

  function refreshStatus() {
    fxaHelper.getAccounts(onFxAccountStateChange, onFxAccountError);
  }

  // if e == null, user is logged out.
  // if e.verified, user is logged in & verified.
  // if !e.verified, user is logged in & unverified.
  function onFxAccountStateChange(e) {
    var email = e ? Normalizer.escapeHTML(e.email) : '';

    if (!e) {
      hideLoggedInPanel();
      hideUnverifiedPanel();
      showLoggedOutPanel();
    } else if (e.verified) {
      hideLoggedOutPanel();
      hideUnverifiedPanel();
      showLoggedInPanel(email);
    } else {
      hideLoggedOutPanel();
      hideLoggedInPanel();
      showUnverifiedPanel(email);
    }
  }

  function onFxAccountError(err) {
    console.error('FxaPanel: Error getting Firefox Account: ' + err.error);
  }

  function hideLoggedOutPanel() {
    loginBtn.onclick = null;
    loggedOutPanel.hidden = true;
  }

  function showLoggedOutPanel() {
    loginBtn.onclick = onLoginClick;
    loggedOutPanel.hidden = false;
  }

  function hideLoggedInPanel() {
    loggedInPanel.hidden = true;
    loggedInEmail.textContent = '';
    logoutBtn.onclick = null;
  }

  function showLoggedInPanel(email) {
    navigator.mozL10n.localize(loggedInEmail, 'fxa-logged-in-text', {
      email: email
    });
    loggedInPanel.hidden = false;
    logoutBtn.onclick = onLogoutClick;
  }

  function hideUnverifiedPanel() {
    unverifiedPanel.hidden = true;
    unverifiedEmail.textContent = '';
    cancelBtn.onclick = null;
    if (resendLink) {
      resendLink.onclick = null;
    }
  }

  function showUnverifiedPanel(email) {
    unverifiedPanel.hidden = false;
    cancelBtn.onclick = onLogoutClick;
    navigator.mozL10n.localize(
      unverifiedEmail,
      'fxa-verification-email-sent-msg',
      {email: email}
    );
    // dynamically construct the resend link
    var dontSeeText = _('fxa-dont-see-email');
    dontSeeText = dontSeeText.replace(
      '{{resend}}',
      '<a href="#" id="fxa-resend">' + _('fxa-resend') + '</a>'
    );
    resendEmail.innerHTML = dontSeeText;
    resendLink = document.getElementById('fxa-resend');
    resendLink.onclick = _onResendClick;
  }

  function onLogoutClick(e) {
    e.stopPropagation();
    e.preventDefault();
    fxaHelper.logout(onFxAccountStateChange, onFxAccountError);
  }

  function _onResendClick(e) {
    e.stopPropagation();
    e.preventDefault();
    if (e.target.classList.contains('disabled')) {
      return;
    }
    fxaHelper.getAccounts(function onGetAccounts(accts) {
      var email = accts && accts.email;
      if (!email) {
        return onFxAccountStateChange(accts);
      }
      fxaHelper.resendVerificationEmail(email, _onResend.bind(null, email),
                                        onFxAccountError);
    }, onFxAccountError);
  }

  function _onResend(email) {
    var resendMsg = _('fxa-resend-alert', { email: email });
    window.alert(resendMsg);
    // disable link for 60 seconds, then reenable
    resendLink.classList.add('disabled');
    setTimeout(function enableResendLink() {
      resendLink.classList.remove('disabled');
    }, 60000);
  }

  function onLoginClick(e) {
    e.stopPropagation();
    e.preventDefault();
    fxaHelper.openFlow(onFxAccountStateChange, onFxAccountError);
  }

  return {
    init: init,
    // exposed for testing
    _onResendClick: _onResendClick,
    _onResend: _onResend
  };

})();
