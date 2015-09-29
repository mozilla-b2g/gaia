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
 *            |                  \       |                        |
 *            |                       FxAccountsClient            |
 *            |                        |                          |
 *            |                        |                          |
 * =============================Gecko======================================
 *            |                        |                          |
 *            |                        |-moz(Chrome/Content)Event |
 *            |                        |                          |
 *       FxAccountsUIGlue    FxAccountsMgmtService                |
 *                 |               ^                              |
 *                 |               |                              |
 *                 |               |                              |
 *                 |__________FxAccountsManager                   |
 *                                 |                              |
 *                                 |                              |
 *                          DOM Identity API impl. _______________|
 */

/* global IACHandler, LazyLoader, FxAccountsClient, FxAccountsUI */

'use strict';

var FxAccountsManager = {

  start: function fxa_mgmt_init() {
    // Set up the listener for IAC API connection requests.
    window.addEventListener('iac-fxa-mgmt', this.onPortMessage);
    // Listen for unsolicited chrome events coming from the implementation of
    // RP DOM API or the Fx Accounts UI glue.
    window.addEventListener('mozFxAccountsUnsolChromeEvent', this);
  },

  sendPortMessage: function fxa_mgmt_sendPortMessage(message) {
    var port = IACHandler.getPort('fxa-mgmt');
    if (port) {
      port.postMessage(message);
    }
  },

  onPortMessage: function fxa_mgmt_onPortMessage(event) {
    if (!event || !event.detail) {
      console.error('Wrong event');
      return;
    }

    var self = FxAccountsManager;
    var methodName = event.detail.name;

    switch (methodName) {
      case 'getAccount':
      case 'logout':
        ((methodName) => {
          LazyLoader.load('js/fx_accounts_client.js').then(() => {
            FxAccountsClient[methodName]().then(data => {
              self.sendPortMessage({ methodName: methodName, data: data });
            }, error => {
              self.sendPortMessage({ methodName: methodName, error: error });
            });
          });
        })(methodName);
        break;
      case 'resendVerificationEmail':
        ((methodName) => {
          var email = event.detail.email;
          if (!email) {
            self.sendPortMessage({ methodName: methodName,
                                   error: 'NO_VALID_EMAIL' });
            return;
          }
          LazyLoader.load('js/fx_accounts_client.js').then(() => {
            FxAccountsClient[methodName](email).then(data => {
              self.sendPortMessage({ methodName: methodName, data: data });
            }, error => {
              self.sendPortMessage({ methodName: methodName, error: error });
            });
          });
        })(methodName);
        break;
      case 'openFlow':
        ((methodName) => {
          FxAccountsUI.login().then(data => {
            self.sendPortMessage({ methodName: methodName, data: data });
          }, error => {
            self.sendPortMessage({ methodName: methodName, error: error });
          });
        })(methodName);
        break;
      case 'refreshAuthentication':
        ((methodName) => {
          var email = event.detail.email;
          if (!email) {
            self.sendPortMessage({ methodName: methodName,
                                   error: 'NO_VALID_EMAIL' });
            return;
          }

          FxAccountsUI.refreshAuthentication(email).then(data => {
            self.sendPortMessage({ methodName: methodName, data: data });
          }, error => {
            self.sendPortMessage({ methodName: methodName, error: error });
          });
        })(methodName);
        break;
    }
  },

  _sendContentEvent: function fxa_mgmt_sendContentEvent(msg) {
    var event = new CustomEvent('mozFxAccountsRPContentEvent', {detail: msg});
    window.dispatchEvent(event);
  },

  handleEvent: function fxa_mgmt_handleEvent(event) {
    if (!event || !event.detail) {
      console.error('Wrong event');
      return;
    }

    var message = event.detail;

    switch (message.eventName) {
      case 'openFlow':
        FxAccountsUI.login().then(result => {
          this._sendContentEvent({
            id: message.id,
            result: result
          });
        }, error => {
          this._sendContentEvent({
            id: message.id,
            error: error
          });
        });
        break;
      case 'refreshAuthentication':
        var email = message.data.email;
        if (!email) {
          console.error('No account id specified');
          return;
        }
        FxAccountsUI.refreshAuthentication(email).then(result => {
          this._sendContentEvent({
            id: message.id,
            result: result
          });
        }, error => {
          this._sendContentEvent({
            id: message.id,
            error: error
          });
        });
        break;
      case 'onlogin':
      case 'onverified':
      case 'onlogout':
        FxAccountsManager.sendPortMessage({ eventName: message.eventName });
        break;
    }
  }
};
