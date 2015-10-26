/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global SettingsHelper, FxaModuleManager, MozActivity */

'use strict';

/*
 * FxModuleServerRequest wraps the functionality exposed by the server,
 * letting our code to be shielded against changes in the API of FxA.
 */

(function(exports) {

  var pref = 'identity.fxaccounts.reset-password.url';
  var fxaSettingsHelper = SettingsHelper(pref);
  var fxaURL;

  fxaSettingsHelper.get(function on_fxa_get_settings(url) {
    fxaURL = url;
  });

  function _setAccountDetails(response) {
    if(response && response.user && response.user.email) {
      FxaModuleManager.setParam('done', true);
      FxaModuleManager.setParam('verified', response.user.verified);
    }
  }

  function _ensureFxaClient(callback) {
    window.parent.LazyLoader.load('../js/fx_accounts_client.js', function() {
      callback && callback();
    });
  }

  var FxModuleServerRequest = {
    checkEmail: function fxmsr_checkEmail(email, onsuccess, onerror) {
      _ensureFxaClient(function() {
        window.parent.FxAccountsClient.queryAccount(
                email,
                onsuccess,
                onerror);
      });
    },
    signIn: function fxmsr_signIn(email, password, onsuccess, onerror) {

      function successHandler(response) {
        _setAccountDetails(response);
        var authenticated =
          (response && response.user && response.user.verified) || false;
        onsuccess && onsuccess({
          authenticated: authenticated
        });
      }

      function errorHandler(response) {
        onerror && onerror(response);
      }

      _ensureFxaClient(function signIn() {
        window.parent.FxAccountsClient.signIn(
                email,
                password,
                successHandler,
                errorHandler);
      });

    },
    signUp: function fxmsr_signUp(email, password, onsuccess, onerror) {
      function successHandler(response) {
        _setAccountDetails(response);
        onsuccess && onsuccess(response);
      }

      _ensureFxaClient(function signUp() {
         window.parent.FxAccountsClient.signUp(
                email,
                password,
                successHandler,
                onerror);
      });
    },
    requestPasswordReset:
      function fxmsr_requestPasswordReset(email, onsuccess, onerror) {
      var url = email ? fxaURL + '?email=' + email : fxaURL;
      var activity = new MozActivity({
        name: 'view',
        data: {
          type: 'url',
          url: url
        }
      });
      activity.onsuccess = function on_reset_success() {
        // TODO When the browser loads, it is *behind* the system app. So we
        //      need to dismiss this app in order to let the user reset their
        //      password.
        onsuccess && onsuccess();
        FxaModuleManager.close();
      };
      activity.onerror = function on_reset_error(err) {
        console.error(err);
        onerror && onerror(err);
      };
    }
  };
  exports.FxModuleServerRequest = FxModuleServerRequest;
}(window));
