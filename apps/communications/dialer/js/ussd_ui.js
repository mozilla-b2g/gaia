'use strict';

var UssdUI = {

  COMMS_APP_ORIGIN: document.location.protocol + '//' +
    document.location.host,
  _: null,
  _conn: null,

  get headerTitleNode() {
    delete this.headerTitleNode;
    return this.headerTitleNode = document.getElementById('header-title');
  },

  get closeNode() {
    delete this.closeNode;
    return this.closeNode = document.getElementById('close');
  },

  get cancelNode() {
    delete this.cancelNode;
    return this.cancelNode = document.getElementById('cancel');
  },

  get sendNode() {
    delete this.sendNode;
    return this.sendNode = document.getElementById('send');
  },

  get messageNode() {
    delete this.messageNode;
    return this.messageNode = document.getElementById('message');
  },

  get responseTextNode() {
    delete this.responseTextNode;
    return this.responseTextNode = document.getElementById('response-text');
  },

  get responseTextResetNode() {
    delete this.responseTextResetNode;
    return this.responseTextResetNode =
      document.getElementById('response-text-reset');
  },

  get messageScreen() {
    delete this.messageScreen;
    return this.messageScreen = document.getElementById('message-screen');
  },

  get loadingOverlay() {
    delete this.loadingOverlay;
    return this.loadingOverlay = document.getElementById('loading-overlay');
  },

  init: function uui_init() {
    if (window.location.hash != '#send') {
      this.hideLoading();
    }
    LazyL10n.get((function localized(_) {
      window.addEventListener('message', this);
      window.dispatchEvent(new CustomEvent('ready'));
      this._ = _;
      this.updateHeader(window.name);
      this.closeNode.addEventListener('click', this.closeWindow.bind(this));
      this.cancelNode.addEventListener('click', this.cancel.bind(this));
      this.sendNode.addEventListener('click', this.reply.bind(this));
      this.responseTextResetNode.addEventListener('click',
        this.resetResponse.bind(this));
      this.responseTextNode.addEventListener('input',
        this.responseUpdated.bind(this));
    }).bind(this));
  },

  closeWindow: function uui_closeWindow() {
    window.opener.postMessage({
      type: 'close'
    }, this.COMMS_APP_ORIGIN);

    window.close();
  },

  cancel: function uui_cancel() {
    window.opener.postMessage({
      type: 'cancel'
    }, this.COMMS_APP_ORIGIN);

    this.hideLoading();

    window.close();
  },

  showMessage: function uui_showMessage(message) {
    this.hideLoading();
    this.responseTextNode.removeAttribute('disabled');
    this.messageNode.textContent = message;
  },

  showLoading: function uui_showLoading() {
    this.loadingOverlay.classList.remove('hide');
    this.loadingOverlay.classList.remove('fadeOut');
    this.loadingOverlay.classList.add('fadeIn');
    this.responseTextNode.setAttribute('disabled', 'disabled');
    this.sendNode.setAttribute('disabled', 'disabled');
  },

  hideLoading: function uui_hideLoading() {
    this.loadingOverlay.classList.remove('fadeIn');
    this.loadingOverlay.classList.add('fadeOut');
    var self = this;
    this.loadingOverlay.addEventListener('animationend',
      function uso_fadeOut(ev) {
        self.loadingOverlay.removeEventListener('animationend', uso_fadeOut);
        self.loadingOverlay.classList.add('hide');
      }
    );
  },

  showResponseForm: function uui_showForm() {
    this.messageScreen.classList.add('responseForm');
  },

  hideResponseForm: function uui_hideForm() {
    this.messageScreen.classList.remove('responseForm');
  },

  resetResponse: function uui_resetResponse() {
    this.responseTextNode.value = '';
    this.sendNode.setAttribute('disabled', 'disabled');
  },

  responseUpdated: function uui_responseUpdated() {
    this.sendNode.disabled =
      (this.responseTextNode.value.length <= 0);
  },

  reply: function uui_reply() {
    this.showLoading();
    var response = this.responseTextNode.value;
    window.opener.postMessage({
      type: 'reply',
      message: response
    }, this.COMMS_APP_ORIGIN);
    this.resetResponse();
  },

  updateHeader: function uui_updateHeader(operator) {
    this.headerTitleNode.textContent =
      this._('ussd-services', {
        operator: operator !== 'Unknown' ? operator : this._('USSD')
      });
  },

  handleEvent: function ph_handleEvent(evt) {
    if (evt.type !== 'message' || evt.origin !== this.COMMS_APP_ORIGIN ||
      !evt.data) {
      return;
    }

    switch (evt.data.type) {
      case 'success':
        this.hideResponseForm();
        this.showMessage(evt.data.result ?
          evt.data.result : this._('mmi-successfully-sent'));
        break;
      case 'error':
        this.showMessage(evt.data.error ?
          evt.data.error : this._('mmi-error'));
        break;
      case 'ussdreceived':
        if (evt.data.sessionEnded) {
          this.hideResponseForm();
          if (evt.data.message == null) {
            evt.data.message = this._('mmi-session-expired');
          }
        } else {
          this.showResponseForm();
        }
        this.showMessage(evt.data.message);
        break;
      case 'voicechange':
        this.updateHeader(evt.data.operator);
        break;
      case 'close':
        this.closeWindow();
        break;
    }
  }
};

window.addEventListener('load', function usui_startup(evt) {
  window.removeEventListener('load', usui_startup);
  UssdUI.init();
});

