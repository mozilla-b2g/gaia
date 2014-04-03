/* global FxAccountsIACHelper, Normalizer */
/* exported FxaMenu */

'use strict';

var FxaMenu = (function fxa_menu() {
  var fxaHelper,
    menuStatus;

  function init(helper) {
    // allow mock to be passed in for unit testing
    fxaHelper = helper || FxAccountsIACHelper;
    menuStatus = document.getElementById('fxa-desc');

    // listen for status updates
    onVisibilityChange();
    // start by asking for current status
    refreshStatus();
    document.addEventListener('visibilitychange', onVisibilityChange);
  }

  function refreshStatus() {
    fxaHelper.getAccounts(onStatusChange, onStatusError);
  }

  // if e == null, user is logged out.
  // if e.verified, user is logged in & verified.
  // if !e.verified, user is logged in & unverified.
  function onStatusChange(e) {
    // XXX FxAccountsIACHelper currently is inconsistent about response format
    //     fix this after 981210 lands (e.accountId vs e.email)
    var email = e ? Normalizer.escapeHTML(e.accountId || e.email) : '';

    if (!e) {
      navigator.mozL10n.localize(menuStatus, 'fxa-login');
    } else if (e.verified) {
      navigator.mozL10n.localize(menuStatus, 'fxa-logged-in-text', {
        email: email
      });
    } else { // unverified
      navigator.mozL10n.localize(menuStatus, 'fxa-check-email', {
        email: email
      });
    }
  }

  function onStatusError(err) {
    console.error('FxaMenu: Error getting Firefox Account: ' + err.error);
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

  return {
    init: init
  };
})();
