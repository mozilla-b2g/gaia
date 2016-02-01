'use strict';

define(function(require) {
  var SettingsPanel = require('modules/settings_panel');
  var FirefoxAccounts = require('panels/firefox_accounts/firefox_accounts');

  return function ctor_firefox_account_panel() {
    var elements;
    var firefoxAccounts = FirefoxAccounts();

    return SettingsPanel({
      onInit: function(panel) {
        elements = {
          fxaContainer: document.getElementById('fxa'),
          loggedOutPanel: document.getElementById('fxa-logged-out'),
          loggedInPanel: document.getElementById('fxa-logged-in'),
          unverifiedPanel: document.getElementById('fxa-unverified'),
          resendEmail: document.getElementById('fxa-resend-email'),
          cancelBtn: document.getElementById('fxa-cancel-confirmation'),
          loginBtn: document.getElementById('fxa-login'),
          logoutBtn: document.getElementById('fxa-logout'),
          loggedInEmail: document.getElementById('fxa-logged-in-text'),
          unverifiedEmail: document.getElementById('fxa-unverified-text'),
          resendLink: document.getElementById('fxa-resend')
        };
        firefoxAccounts.onInit(elements);
      },
      onBeforeShow: function() {
        firefoxAccounts.onBeforeShow();
      },
      onBeforeHide: function() {
        firefoxAccounts.onBeforeHide();
      }
    });
  };
});
