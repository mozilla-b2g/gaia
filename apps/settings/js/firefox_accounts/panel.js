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
    signoutemail,
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
    signoutemail = document.getElementById('fxa-signout-alert');
    menuStatus1 = document.getElementById('findmydevice-desc');
    menuStatus = document.getElementById('fxa-desc'),

    // listen for changes
    onVisibilityChange();
    // start by checking current status
    refreshStatus();
    document.addEventListener('visibilitychange', onVisibilityChange);
  }

  function onVisibilityChange() {
    if (document.hidden) {
      fxaHelper.removeEventListener('onlogin', refreshStatus);
      fxaHelper.removeEventListener('onverified', refreshStatus);
      fxaHelper.removeEventListener('onlogout', refreshStatus);
    } else {
      fxaHelper.addEventListener('onlogin', refreshStatus);
      fxaHelper.addEventListener('onverified', refreshStatus);
      fxaHelper.addEventListener('onlogout', refreshStatus);
      refreshStatus();
    }
  }

  function refreshStatus() {
    fxaHelper.getAccounts(onFxAccountStateChange, onFxAccountError);
    fxaHelper.getAccounts(onStatusChange, onStatusError);

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

  function onStatusChange(e) {
    var email = e ? Normalizer.escapeHTML(e.email) : '';
    console.log("onstatus change");

    if (!e) {
      menuStatus.setAttribute('data-l10n-id', 'fxa-invitation');
      menuStatus.removeAttribute('data-l10n-args');
      navigator.mozL10n.setAttributes(menuStatus1, 'fxa-disabled', {
      });
    } else if (e.verified) {
      navigator.mozL10n.setAttributes(menuStatus, 'fxa-logged-in-text2', {
        email: email
        });
        navigator.mozL10n.setAttributes(menuStatus1, 'fxa-enabled', {
        });

    } else { // unverified
      navigator.mozL10n.setAttributes(menuStatus, 'fxa-confirm-email', {
        email: email
      });
    }
  }

  function onVisibilityChange() {
    if (document.hidden) {
      fxaHelper.removeEventListener('onlogin', refreshStatus);
      fxaHelper.removeEventListener('onverified', refreshStatus);
      fxaHelper.removeEventListener('onlogout', refreshStatus);
    } else {
      fxaHelper.addEventListener('onlogin', refreshStatus);
      fxaHelper.addEventListener('onverified', refreshStatus);
      fxaHelper.addEventListener('onlogout', refreshStatus);
      refreshStatus();
    }
  }



  function onStatusError(err) {
    console.error('FxaMenu: Error getting Firefox Account: ' + err.error);
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
    navigator.mozL10n.setAttributes(loggedInEmail, 'fxa-logged-in-text', {
      email: email
    });
    navigator.mozL10n.setAttributes(signoutemail, 'fxa-signout-alert', {
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
    navigator.mozL10n.setAttributes(
      unverifiedEmail,
      'fxa-verification-email-sent-msg',
      {email: email}
    );
    // dynamically construct the resend link
    var dontSeeText = _('fxa-dont-see-email');
    dontSeeText = dontSeeText.replace(
      /{{\s*resend\s*}}/,
      '<a href="#" id="fxa-resend">' + _('fxa-resend') + '</a>'
    );
    resendEmail.innerHTML = dontSeeText;
    resendLink = document.getElementById('fxa-resend');
    resendLink.onclick = _onResendClick;
  }

  function onLogoutClick(e) {
    e.stopPropagation();
    e.preventDefault();
    fxaHelper.logout(onStatusChange, onStatusError);
    var pop = document.getElementById("fxa-form");
    pop.hidden = true;
  }

  var cancelHandler = function() {
   var pop = document.getElementById("fxa-form");
   pop.hidden = true;
   };

  var makeUnhidden = function(){
   var pop = document.getElementById("fxa-form");
   pop.hidden = false;

  var cancelButton = document.getElementById('fxa-cancel');
   cancelButton.addEventListener('click', cancelHandler);
  };

  var Format_open = function(email){
   var openFormat = document.getElementById("sign-out");
   openFormat.addEventListener('click',makeUnhidden);
};
 Format_open();


  function _onResendClick(e) {
    e.stopPropagation();
    e.preventDefault();
    if (e.target.classList.contains('disabled')) {
      return;
    }
    fxaHelper.getAccounts(function onGetAccounts(accts) {
      var email = accts && accts.email;
      if (!email) {
        return onStatusChange(accts);
      }
      fxaHelper.resendVerificationEmail(email, _onResend.bind(null , email),
                                        onStatusError);
    }, onStatusError);
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
    fxaHelper.openFlow(onStatusChange, onStatusError);
  }

  return {
    init: init,
    // exposed for testing
    _onResendClick: _onResendClick,
    _onResend: _onResend
  };

})();
