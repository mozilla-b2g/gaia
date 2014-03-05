'use strict';

var FxAccountsUI = {
  dialog: null,
  panel: null,
  onerrorCB: null,
  onsuccessCB: null,
  init: function fxa_ui_init() {
    var dialogOptions = {
      onHide: this.reset.bind(this)
    };
    if (!this.dialog) {
      this.dialog = new FxAccountsDialog(dialogOptions);
    }
    this.panel = this.dialog.getView();
    this.iframe = document.createElement('iframe');
    this.iframe.id = 'fxa-iframe';
  },
  // Sign in/up flow
  login: function fxa_ui_login(onsuccess, onerror) {
    this.onsuccessCB = onsuccess;
    this.onerrorCB = onerror;
    this.loadFlow('login');
  },
  // Logout flow
  logout: function fxa_ui_login(onsuccess, onerror) {
    this.onsuccessCB = onsuccess;
    this.onerrorCB = onerror;
    this.loadFlow('logout');
  },
  // Delete flow
  delete: function fxa_ui_delete(onsuccess, onerror) {
    this.onsuccessCB = onsuccess;
    this.onerrorCB = onerror;
    this.loadFlow('delete');
  },
  // Method which close the Dialog
  close: function fxa_ui_close() {
    var self = this;
    this.panel.addEventListener('animationend', function closeAnimationEnd() {
      self.panel.removeEventListener('animationend', closeAnimationEnd, false);
      self.panel.classList.remove('closing');
      self.dialog.hide();
    }, false);
    this.panel.classList.add('closing');
  },
  // Method for reseting the panel
  reset: function fxa_ui_reset() {
    this.panel.innerHTML = '';
    this.onerrorCB = null;
    this.onsuccessCB = null;
  },
  // Method for loading the iframe with the flow required
  loadFlow: function fxa_ui_loadFlow(flow) {
    this.iframe.setAttribute('src', '../fxa/fxa_module.html#' + flow);
    this.panel.appendChild(this.iframe);
    this.dialog.show();
  },
  // Method for sending the result of the FxAccounts flow to the caller app
  done: function(data) {
    // Proccess data retrieved
    this.onsuccessCB && this.onsuccessCB(data);
    this.close();
  },
  error: function(error) {
    this.onerrorCB && this.onerrorCB(error);
    this.close();
  }
};

FxAccountsUI.init();

