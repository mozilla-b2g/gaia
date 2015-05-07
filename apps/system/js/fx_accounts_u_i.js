/* global FxAccountsDialog, Service, LazyLoader */

'use strict';

(function(exports) {
  var FxAccountsUI = {
    name: 'FxAccountsUI',
    dialog: null,
    panel: null,
    iframe: null,
    onerrorCb: null,
    onsuccessCb: null,

    init: function init() {
      var dialogOptions = {
        onHide: this.reset.bind(this)
      };
      if (!this.dialog) {
        LazyLoader.load('js/fxa_dialog.js').then(() => {
          this.dialog = new FxAccountsDialog(dialogOptions);
          this.panel = this.dialog.getView();
        }).catch((err) => {
          console.error(err);
        });
      }
      this.iframe = document.createElement('iframe');
      this.iframe.id = 'fxa-iframe';
      Service.register('login', this);
      Service.register('close', this);
    },

    // Sign in/up flow.
    login: function fxa_ui_login(onsuccess, onerror) {
      this.onsuccessCb = onsuccess;
      this.onerrorCb = onerror;
      this.loadFlow('login');
    },

    // Logout flow.
    logout: function fxa_ui_logout(onsuccess, onerror) {
      this.onsuccessCb = onsuccess;
      this.onerrorCb = onerror;
      this.loadFlow('logout');
    },

    // Delete flow.
    delete: function fxa_ui_delete(onsuccess, onerror) {
      this.onsuccessCb = onsuccess;
      this.onerrorCb = onerror;
      this.loadFlow('delete');
    },

    // Refresh authentication flow.
    refreshAuthentication: function fxa_ui_refreshAuth(email,
                                                       onsuccess,
                                                       onerror) {
      this.onsuccessCb = onsuccess;
      this.onerrorCb = onerror;
      this.loadFlow('refresh_auth', ['email=' + email]);
    },

    // Method which close the dialog.
    close: function fxa_ui_close() {
      var self = this;
      this.panel.addEventListener('animationend', function closeAnimationEnd() {
        self.panel.removeEventListener('animationend',
          closeAnimationEnd, false);
        self.panel.classList.remove('closing');
        self.dialog.hide();
      }, false);
      this.panel.classList.add('closing');
    },

    // Method for reseting the panel.
    reset: function fxa_ui_reset(reason) {
      this.panel.removeChild(this.iframe);
      this.dialog.browser = null;
      if (reason == 'home' || reason == 'holdhome') {
        this.onerrorCb && this.onerrorCb('DIALOG_CLOSED_BY_USER');
      }
      this.onerrorCb = null;
      this.onsuccessCb = null;
    },

    // Method for loading the iframe with the flow required.
    loadFlow: function fxa_ui_loadFlow(flow, params) {
      var url = '../fxa/fxa_module.html#' + flow;
      if (Service.query('isFtuRunning')) {
        params = params || [];
        params.push('isftu=true');
      }
      if (params && Array.isArray(params)) {
        url += '?' + params.join('&');
      }
      this.iframe.setAttribute('src', url);
      this.panel.appendChild(this.iframe);
      this.dialog.browser = { element: this.iframe };
      this.dialog.show();
    },

    // Method for sending the result of the FxAccounts flow to the caller app.
    done: function fxa_ui_done(data) {
      // Proccess data retrieved.
      this.onsuccessCb && this.onsuccessCb(data);
      this.close();
    },

    error: function fxa_ui_error(error) {
      this.onerrorCb && this.onerrorCb(error);
      this.close();
    }
  };
  exports.FxAccountsUI = FxAccountsUI;
}(window));
