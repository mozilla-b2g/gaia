/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/*
 * FxModuleServerRequest wraps the functionality exposed by the server,
 * letting our code to be shielded against changes in the API of FxA.
 */

(function(exports) {

  function _setAccountDetails(response) {
    if (response && response.user.accountId) {
      FxaModuleManager.setParam('email', response.user.accountId);
      FxaModuleManager.setParam('verified', response.user.verified);
    }
  }

  function _ensureFxaClient(callback) {
    window.parent.LazyLoader.load('../js/fxa_client.js', function() {
      callback && callback();
    });
  };

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
      // https://bugzilla.mozilla.org/show_bug.cgi?id=945365
      onsuccess && onsuccess();
    }
  };
  exports.FxModuleServerRequest = FxModuleServerRequest;
}(this));
