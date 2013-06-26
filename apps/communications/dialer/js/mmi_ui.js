'use strict';

var MmiUI = {

  COMMS_APP_ORIGIN: document.location.protocol + '//' +
    document.location.host,
  _: null,

  get headerTitleNode() {
    delete this.headerTitleNode;
    return this.headerTitleNode = document.getElementById('header-title');
  },

  get closeNode() {
    delete this.closeNode;
    return this.closeNode = document.getElementById('mmi-close');
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

  get mmiScreen() {
    delete this.mmiScreen;
    return this.mmiScreen = document.getElementById('mmi-screen');
  },

  get loadingOverlay() {
    delete this.loadingOverlay;
    return this.loadingOverlay = document.getElementById('loading-overlay');
  },

  init: function mui_init() {
    LazyL10n.get((function localized(_) {
      window.addEventListener('message', this);

      this._ = _;

      this.closeNode.addEventListener('click', this.closeWindow.bind(this));
      this.cancelNode.addEventListener('click', this.cancel.bind(this));
      this.sendNode.addEventListener('click', this.reply.bind(this));
      this.responseTextResetNode.addEventListener('click',
        this.resetResponse.bind(this));
      this.responseTextNode.addEventListener('input',
        this.responseUpdated.bind(this));
    }).bind(this));
  },

  showWindow: function mui_showWindow() {
    this.mmiScreen.hidden = false;
  },

  closeWindow: function mui_closeWindow() {
    window.postMessage({
      type: 'mmi-cancel'
    }, this.COMMS_APP_ORIGIN);
    this.mmiScreen.hidden = true;
  },

  cancel: function mui_cancel() {
    this.hideLoading();
    this.closeWindow();
  },

  showMessage: function mui_showMessage(message, header) {
    this.showWindow();
    this.hideLoading();
    this.responseTextNode.removeAttribute('disabled');
    this.messageNode.textContent = message;
    if (header && header.length) {
      this.headerTitleNode.textContent = header;
    } else {
      this.headerTitleNode.textContent = '';
    }
  },

  showLoading: function mui_showLoading() {
    this.loadingOverlay.classList.remove('hide');
    this.loadingOverlay.classList.remove('fade-out');
    this.loadingOverlay.classList.add('fade-in');
    this.responseTextNode.setAttribute('disabled', 'disabled');
    this.sendNode.setAttribute('disabled', 'disabled');
  },

  hideLoading: function mui_hideLoading() {
    this.loadingOverlay.classList.remove('fade-in');
    this.loadingOverlay.classList.add('fade-out');
    var self = this;
    this.loadingOverlay.addEventListener('animationend',
      function uso_fadeOut(ev) {
        self.loadingOverlay.removeEventListener('animationend', uso_fadeOut);
        self.loadingOverlay.classList.add('hide');
      }
    );
  },

  showResponseForm: function mui_showForm() {
    this.mmiScreen.classList.add('responseForm');
  },

  hideResponseForm: function mui_hideForm() {
    this.mmiScreen.classList.remove('responseForm');
  },

  resetResponse: function mui_resetResponse() {
    this.responseTextNode.value = '';
    this.sendNode.setAttribute('disabled', 'disabled');
  },

  responseUpdated: function mui_responseUpdated() {
    this.sendNode.disabled =
      (this.responseTextNode.value.length <= 0);
  },

  reply: function mui_reply() {
    this.showLoading();
    var response = this.responseTextNode.value;
    window.postMessage({
      type: 'mmi-reply',
      message: response
    }, this.COMMS_APP_ORIGIN);
    this.resetResponse();
  },

  handleEvent: function ph_handleEvent(evt) {
    if (evt.type !== 'message' || evt.origin !== this.COMMS_APP_ORIGIN ||
      !evt.data) {
      return;
    }

    var data = evt.data;

    switch (data.type) {
      case 'mmi-success':
        this.hideResponseForm();
        var msg = data.result ? data.result : this._('mmi-successfully-sent');
        var header = data.title ? data.title : undefined;
        this.showMessage(msg, header);
        break;
      case 'mmi-error':
        this.handleError(data);
        break;
      case 'mmi-received-ui':
        if (data.sessionEnded) {
          this.hideResponseForm();
          if (data.message == null) {
            data.message = this._('mmi-session-expired');
          }
        } else {
          this.showResponseForm();
        }
        this.showMessage(data.message, data.title);
        break;
      case 'mmi-loading':
        this.showLoading();
        break;
    }
  },

  handleError: function ph_handleError(data) {
    var header = data.title ? data.title : undefined;
    var error = data.error ? data.error : this._('mmi-error');
    this.showMessage(error, header);
  }
};

MmiUI.init();
