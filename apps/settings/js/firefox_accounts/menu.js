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
    fxaHelper.getAccount(onStatusChange, onStatusError);
  }

  // if e == null, user is logged out.
  // if e.verified, user is logged in & verified.
  // if !e.verified, user is logged in & unverified.
  function onStatusChange(e) {
    var email = e ? Normalizer.escapeHTML(e.email) : '';

    if (!e) {
      menuStatus.setAttribute('data-l10n-id', 'fxa-invitation');
      menuStatus.removeAttribute('data-l10n-args');
    } else if (e.verified) {
      navigator.mozL10n.setAttributes(menuStatus, 'fxa-logged-in-text', {
        email: email
      });
    } else { // unverified
      navigator.mozL10n.setAttributes(menuStatus, 'fxa-confirm-email', {
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
      fxaHelper.removeEventListener('onverified', refreshStatus);
      fxaHelper.removeEventListener('onlogout', refreshStatus);
    } else {
      fxaHelper.addEventListener('onlogin', refreshStatus);
      fxaHelper.addEventListener('onverified', refreshStatus);
      fxaHelper.addEventListener('onlogout', refreshStatus);
      refreshStatus();
    }
  }

  return {
    init: init
  };
})();
