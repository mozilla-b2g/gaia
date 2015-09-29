/* global FxAccountsDialog, Service, LazyLoader */

'use strict';

(function(exports) {
  var FxAccountsUI = {
    name: 'FxAccountsUI',
    dialog: null,
    panel: null,
    iframe: null,
    promise: null,

    start: function() {
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
    logout: function fxa_ui_logout() {
      return this.loadFlow('logout');
    },

    // Delete flow.
    delete: function fxa_ui_delete() {
      return this.loadFlow('delete');
    },

    // Refresh authentication flow.
    refreshAuthentication: function fxa_ui_refreshAuth(email) {
      return this.loadFlow('refresh_auth', ['email=' + email]);
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
        this.promise && this.promise.reject('DIALOG_CLOSED_BY_USER');
      }
      this.promise = null;
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
      return new Promise((resolve, reject) => {
        this.promise = { resolve, reject };
      });
    },

    // Method for sending the result of the FxAccounts flow to the caller app.
    done: function fxa_ui_done(data) {
      // Proccess data retrieved.
      this.promise && this.promise.resolve(data);
      this.close();
    },

    error: function fxa_ui_error(error) {
      this.promise && this.promise.reject(error);
      this.close();
    }
  };
  exports.FxAccountsUI = FxAccountsUI;
}(window));
