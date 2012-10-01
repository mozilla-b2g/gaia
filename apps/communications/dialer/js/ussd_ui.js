'use strict';

var UssdUI = {

  _: null,
  _origin: null,
  _conn: null,

  get headerTitleNode() {
    delete this.headerTitleNode;
    return this.headerTitleNode = document.getElementById('header-title');
  },

  get closeNode() {
    delete this.closeNode;
    return this.closeNode = document.getElementById('close');
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

  init: function uui_init() {
    this._ = window.navigator.mozL10n.get;
    this.updateHeader(window.name);
    this.closeNode.addEventListener('click', this.closeWindow.bind(this));
    this.sendNode.addEventListener('click', this.reply.bind(this));
    this.responseTextResetNode.addEventListener('click',
      this.resetResponse.bind(this));
    this.responseTextNode.addEventListener('input',
      this.responseUpdated.bind(this));
    this._origin = document.location.protocol + '//' +
      document.location.host;
    window.addEventListener('message', this);
  },

  closeWindow: function uui_close() {
    window.opener.postMessage({
      type: 'close'
    }, this._origin);

    window.close();
  },

  showMessage: function uui_showMessage(message) {
    document.body.classList.remove('loading');
    this.responseTextNode.removeAttribute('disabled');
    this.messageNode.textContent = message;
  },

  showLoading: function uui_showLoading() {
    document.body.classList.add('loading');
    this.responseTextNode.setAttribute('disabled', 'disabled');
    this.sendNode.setAttribute('disabled', 'disabled');
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
    }, this._origin);
    this.resetResponse();
  },

  updateHeader: function uui_updateHeader(operator) {
    this.headerTitleNode.textContent =
      this._('ussd-services', {
        operator: operator !== 'Unknown' ? operator : this._('USSD')
      });
  },

  handleEvent: function ph_handleEvent(evt) {
    if (evt.type !== 'message' || !evt.data)
      return;

    switch (evt.data.type) {
      case 'success':
        this.showMessage(evt.data.result ?
          evt.data.result : this._('message-successfully-sent'));
        break;
      case 'error':
        this.showMessage(evt.data.error ?
          evt.data.error : this._('ussd-server-error'));
        break;
      case 'ussdreceived':
        this.showMessage(evt.data.message);
        break;
      case 'voicechange':
        this.updateHeader(evt.data.operator);
        break;
    }
  }
};

window.addEventListener('localized', function usui_startup(evt) {
  UssdUI.init();
});

