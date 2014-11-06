/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global BrowserFrame, EntrySheet, FxaModuleManager, MozActivity,
   SettingsHelper */

'use strict';

/*
 * FxModuleServerRequest wraps the functionality exposed by the server,
 * letting our code to be shielded against changes in the API of FxA.
 */

(function(exports) {

  var _entrySheet;

  function _setAccountDetails(response) {
    if(response && response.user && response.user.email) {
      FxaModuleManager.setParam('done', true);
      FxaModuleManager.setParam('verified', response.user.verified);
    }
  }

  function _ensureFxaClient(callback) {
    window.parent.LazyLoader.load('../js/fxa_client.js', function() {
      callback && callback();
    });
  }

  // Open external link with a Web Activity
  //
  // When the browser loads, it is *behind* the system app. So we need to
  // dismiss this app in order to let the user reset their password or view
  // the privacy/terms-of-service pages. This doesn't work in FTU, so there
  // we use the EntrySheet method instead. See also bug 1082444.
  function _openWebActivity(url, onerror) {
    var activity = new MozActivity({
      name: 'view',
      data: {
        type: 'url',
        url: url
      }
    });
    activity.onsuccess = function onLoadExternalLinkSuccess() {
      FxaModuleManager.close();
    };
    activity.onerror = function onLoadExternalLinkError(err) {
      console.error(err);
      onerror && onerror(err);
    };
  }

  // Open external link in an EntrySheet
  //
  // Used for FTU, where we cannot switch to the browser and close the app
  // without problems. See also bug 1082444.
  function _openEntrySheet(url) {
    if (_entrySheet) {
      _entrySheet.close();
      _entrySheet = null;
    }
    _entrySheet = new EntrySheet(
      window.top.document.getElementById('screen'),
      url,
      new BrowserFrame({url: url})
    );
    _entrySheet.open();

    function onVisibilityChange() {
      /*jshint validthis:true */
      if (document.hidden) {
        document.removeEventListener('visibilitychange', onVisibilityChange);
        if (_entrySheet) {
          _entrySheet.close();
          _entrySheet = null;
        }
      }
    }

    document.addEventListener(
      'visibilitychange',
      onVisibilityChange
    );
  }

  function _loadExternalURL(url, isFTU, onerror) {
    isFTU ? _openEntrySheet(url) : _openWebActivity(url, onerror);
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
      function fxmsr_requestPasswordReset(email, isFTU, onerror) {
      const setting = 'identity.fxaccounts.reset-password.url';
      SettingsHelper(setting).get(function(url) {
        if (!url) {
          return console.error('Failed to load ' + setting);
        }
        if (email) {
          url += '?email=' + email;
        }
        _loadExternalURL(url, isFTU, onerror);
      });
    },
    loadTermsURL: function fxmsr_loadTermsURL(isFTU) {
      const setting = 'identity.fxaccounts.terms.url';
      SettingsHelper(setting).get(function(url) {
        url ? _loadExternalURL(url, isFTU) :
          console.error('Failed to load ' + setting);
      });
    },
    loadPrivacyURL: function fxmsr_loadPrivacyURL(isFTU) {
      const setting = 'identity.fxaccounts.privacy.url';
      SettingsHelper(setting).get(function(url) {
        url ? _loadExternalURL(url, isFTU) :
          console.error('Failed to load ' + setting);
      });
    }
  };
  exports.FxModuleServerRequest = FxModuleServerRequest;
}(window));
