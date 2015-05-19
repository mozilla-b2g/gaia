/* globals MmiManager */

/* exported MmiUI */

'use strict';

var MmiUI = {

  _: null,

  headerTitleNode: null,
  headerNode: null,
  cancelNode: null,
  sendNode: null,
  messageNode: null,
  responseTextNode: null,
  responseTextResetNode: null,
  mmiScreen: null,
  loadingOverlay: null,

  init: function mui_init() {
    this.headerTitleNode = document.getElementById('header-title');
    this.headerNode = document.getElementById('mmi-header');
    this.cancelNode = document.getElementById('cancel');
    this.sendNode = document.getElementById('send');
    this.messageNode = document.getElementById('message');
    this.responseTextNode = document.getElementById('response-text');
    this.responseTextResetNode = document.getElementById('response-text-reset');
    this.mmiScreen = document.getElementById('mmi-screen');
    this.loadingOverlay = document.getElementById('loading-overlay');

    this.headerNode.addEventListener('action', this.closeWindow.bind(this));
    this.cancelNode.addEventListener('click', this.cancel.bind(this));
    this.sendNode.addEventListener('click', this.reply.bind(this));
    this.responseTextResetNode.addEventListener('click',
      this.resetResponse.bind(this));
    this.responseTextNode.addEventListener('input',
      this.responseUpdated.bind(this));
  },

  showWindow: function mui_showWindow() {
    this.mmiScreen.hidden = false;
  },

  closeWindow: function mui_closeWindow() {
    this.resetResponse();
    this.mmiScreen.hidden = true;
  },

  cancel: function mui_cancel() {
    MmiManager.cancel();
    this.hideLoading();
    this.closeWindow();
  },

  showMessage: function mui_showMessage(message, title) {
    this.showWindow();
    this.hideLoading();
    this.responseTextNode.removeAttribute('disabled');

    navigator.mozL10n.setAttributes(this.messageNode, message.id, message.args);
    navigator.mozL10n.setAttributes(this.headerTitleNode, title.id, title.args);

    // Make sure the app is displayed
    navigator.mozApps.getSelf().onsuccess = function getSelfCB(evt) {
      evt.target.result.launch('dialer');
    };
  },

  showLoading: function mui_showLoading() {
    this.loadingOverlay.classList.remove('hide');
    this.loadingOverlay.classList.remove('fade-out');
    this.loadingOverlay.classList.add('fade-in');
    this.responseTextNode.setAttribute('disabled', 'disabled');
    this.sendNode.setAttribute('disabled', 'disabled');
  },

  hideLoading: function mui_hideLoading() {
    var self = this;

    this.loadingOverlay.classList.remove('fade-in');
    this.loadingOverlay.addEventListener('animationend',
    function mui_fadeOut(ev) {
     self.loadingOverlay.removeEventListener('animationend', mui_fadeOut);
     self.loadingOverlay.classList.add('hide');
    });
    this.loadingOverlay.classList.add('fade-out');
  },

  showResponseForm: function mui_showForm() {
    this.mmiScreen.classList.add('responseForm');
    this.sendNode.classList.remove('hide');
  },

  hideResponseForm: function mui_hideForm() {
    this.mmiScreen.classList.remove('responseForm');
    this.sendNode.classList.add('hide');
  },

  resetResponse: function mui_resetResponse() {
    this.responseTextNode.value = '';
    this.sendNode.setAttribute('disabled', 'disabled');
  },

  responseUpdated: function mui_responseUpdated() {
    if (this.responseTextNode.value.length <= 0) {
      this.sendNode.setAttribute('disabled', 'disabled');
    } else {
      this.sendNode.removeAttribute('disabled');
    }
  },

  reply: function mui_reply() {
    this.showLoading();
    MmiManager.reply(this.responseTextNode.value);
    this.resetResponse();
  },

  success: function mui_success(message, title) {
    this.hideResponseForm();
    this.showMessage(message, title);
  },

  error: function mui_error(error, title) {
    this.hideResponseForm();
    this.showMessage(error, title);
  },

  received: function mui_received(session, message, title) {
    if (!session) {
      this.hideResponseForm();
      if (message === null) {
        message.id = 'mmi_session_expired';
      }
    } else {
      this.showResponseForm();
    }

    this.showMessage(message, title);
  },

  loading: function mui_loading() {
    this.showLoading();
  },
};
