'use strict';
/* global ScreenManager, ModalDialog */

(function(exports) {

  /**
   * Note: Values copied from Gecko:
   *       toolkit/devtools/security/auth.js
   */
  var AuthenticationResult = {

    /**
     * Close all listening sockets, and disable them from opening again.
     */
    DISABLE_ALL: 'DISABLE_ALL',

    /**
     * Deny the current connection.
     */
    DENY: 'DENY',

    /**
     * Additional data needs to be exchanged before a result can be determined.
     */
    PENDING: 'PENDING',

    /**
     * Allow the current connection.
     */
    ALLOW: 'ALLOW',

    /**
     * Allow the current connection, and persist this choice for future
     * connections from the same client.  This requires a trustable mechanism to
     * identify the client in the future, such as the cert used during OOB_CERT.
     */
    ALLOW_PERSIST: 'ALLOW_PERSIST'

  };

  /**
   * RemoteDebugger displays a prompt asking the user if they want to enable
   * remote debugging on their device. This is generally called when the user
   * attempts to access the device from the App Manager.
   * @requires ModalDialog
   * @requires ScreenManager
   * @class RemoteDebugger
   */
  function RemoteDebugger() {
    window.addEventListener('mozChromeEvent', this);
  }

  RemoteDebugger.prototype = {

    /**
     * General event handler interface.
     * Displays the modal dialog when we needed.
     * @memberof RemoteDebugger.prototype
     * @param  {DOMEvent} evt The event.
     */
    handleEvent: function(e) {
      if (e.detail.type !== 'remote-debugger-prompt') {
        return;
      }

      // We want the user attention, so we need to turn the screen on
      // if it's off.
      if (!ScreenManager.screenEnabled) {
        ScreenManager.turnScreenOn();
      }

      var session = e.detail.session;
      var dialog;
      if (!session.server.port) {
        dialog = this._buildUSBDialog(session);
      } else {
        dialog = this._buildTCPDialog(session);
      }

      if (!dialog) {
        // Session does not meet the requirements of this dialog, so deny the
        // connection immediately.
        this._dispatchEvent(AuthenticationResult.DENY);
        return;
      }

      // Reusing the ModalDialog infrastructure.
      ModalDialog.showWithPseudoEvent({
        type: 'selectone',
        title: dialog.title,
        text: dialog.options,
        callback: this._dispatchEvent.bind(this),
        cancel: this._dispatchEvent.bind(this)
      });
    },

    _buildUSBDialog: function(session) {
      var dialog = {};
      if (session.authentication !== 'PROMPT') {
        // This dialog is not prepared for any other authentication method at
        // this time.
        return false;
      }
      dialog.title = 'remoteDebuggerPromptUSB';
      dialog.options = [
        {
          id: AuthenticationResult.ALLOW,
          text: 'remoteDebuggerPrompt-allow'
        },
        {
          id: AuthenticationResult.DENY,
          text: 'remoteDebuggerPrompt-deny'
        }
      ];
      return dialog;
    },

    _buildTCPDialog: function(session) {
      var dialog = {};
      if (session.authentication !== 'OOB_CERT' || !session.client.cert) {
        // This dialog is not prepared for any other authentication method at
        // this time.
        return false;
      }
      dialog.title = {
        id: 'remoteDebuggerPromptTCP2',
        args: {
          host: session.client.host,
          port: session.client.port
        }
      };
      dialog.options = [
        {
          id: AuthenticationResult.ALLOW,
          text: 'remoteDebuggerPrompt-scan'
        },
        {
          id: AuthenticationResult.ALLOW_PERSIST,
          text: 'remoteDebuggerPrompt-scanAndRemember'
        }
      ];
      return dialog;
    },

    /**
     * Dispatches an event based on the user selection of the modal dialog.
     * @memberof RemoteDebugger.prototype
     * @param  {String} id ID of option chosen, or null if cancelled.
     */
    _dispatchEvent: function(id) {
      var authResult = id || AuthenticationResult.DENY;
      var event = document.createEvent('CustomEvent');
      event.initCustomEvent('mozContentEvent', true, true,
                            { type: 'remote-debugger-prompt',
                              authResult: authResult });
      window.dispatchEvent(event);
    }
  };

  exports.RemoteDebugger = RemoteDebugger;

}(window));
