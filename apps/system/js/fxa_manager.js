/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/**
 * Firefox Accounts is a database of users who have opted in to services in
 * the Mozilla cloud. Firefox Accounts holds Mozilla specific information
 * (which of your devices are attached right now?), as well as one (and
 * eventually multiple) verified identities for a user.
 *
 * Firefox Accounts is a web scale service with a REST API, that allows a user
 * agent to authenticate to the service (by verifying the user's identity),
 * and in exchange to get credentials that allow the user agent to assert the
 * identity of the user to other services.
 *
 * FxAccountsManager is mostly a proxy between certified apps that wants to
 * manage Firefox Accounts (FTU and Settings so far) and the platform.
 * It handles the communication via IAC and redirects the requests coming from
 * these apps to the platform in the form of mozContentEvents. It also handles
 * sign-in requests done via the mozId API from RPs and triggers FxAccountsUI
 * to show the appropriate UI in each case.
 *
 *
 * =FTU=                          =Settings=                     =RP=
 *   |                           /                                |
 *   |-IAC                  IAC-/                                 |
 *    \                        /                                  |
 * ========================System=======================          |
 *       \                  /                                     |
 *        \                /       FxAccountsUI                   |
 *       FxAccountsManager ______/       |                        |-mozId API
 *                               \       |                        |
 *                                 FxAccountsClient               |
 *                                    |                           |
 *                                    |                           |
 * =============================Gecko===============================
 *                                    |                           |
 *                                    |-moz(Chrome/Content)Event  |
 *                                    |                           |
 *                         SignInFxAccounts                       |
 *                                ^                               |
 *                                |                               |
 *                                |                               |
 *                                |                               |
 *                      nsIDOMIdentityService ____________________/
 */

'use strict';

var FxAccountsManager = {
  init: function fxa_mgmt_init() {
    // Set up the listener for IAC API connection requests.
    window.addEventListener('iac-fxa-mgmt', this.onPortMessage);
    // Listen for chrome events coming from the implementation of RP DOM API.
    window.addEventListener('mozFxAccountsRPChromeEvent', this);
  },

  onPortMessage: function fxa_mgmt_onPortMessage(event) {
    if (!event || !event.detail) {
      console.error('Wrong event');
      return;
    }

    var _successCb = function _successCb(data) {
      var port = IACHandler.getPort('fxa-mgmt');
      port.postMessage({ data: data });
    };

    var _errorCb = function _errorCb(error) {
      var port = IACHandler.getPort('fxa-mgmt');
      port.postMessage({ error: error });
    };

    var message = event.detail;

    switch (message.name) {
      case 'getAccounts':
        LazyLoader.load('js/fxa_client.js', function() {
          FxAccountsClient.getAccounts(_successCb, _errorCb);
        });
        break;
      case 'openFlow':
        FxAccountsUI.login(_successCb, _errorCb);
        break;
      case 'logout':
        LazyLoader.load('js/fxa_client.js', function() {
          FxAccountsClient.logout(_successCb, _errorCb);
        });
        break;
      case 'changePassword':
        break;
    }
  },

  _sendContentEvent: function fxa_mgmt_sendContentEvent(aMsg) {
    var event = document.createEvent('CustomEvent');
    event.initCustomEvent('mozFxAccountsRPContentEvent', true, true, aMsg);
    window.dispatchEvent(event);
  },

  handleEvent: function fxa_mgmt_handleEvent(event) {
    if (!event || !event.detail) {
      console.error('Wrong event');
      return;
    }

    var message = event.detail;

    if (!message.id) {
      console.warn('Got chrome event without id!');
      return;
    }

    switch (message.method) {
      case 'openFlow':
        FxAccountsUI.login(function(result) {
          FxAccountsManager._sendContentEvent({
            id: message.id,
            result: result
          });
        }, function(error) {
          FxAccountsManager._sendContentEvent({
            id: message.id,
            error: error
          });
        });
        break;
    }
  }
};

FxAccountsManager.init();
