/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var Feedback = {
  feedbackObj: {
    product: 'Firefox OS',
    platform: 'Firefox OS'
  },

  init: function fk_init() {
    this.feedbackHappy = document.getElementById('feedback-happy');
    this.feedbackSad = document.getElementById('feedback-sad');
    this.feedbackHappy.addEventListener('click', this);
    this.feedbackSad.addEventListener('click', this);
    this.feedbackDialogInitFlag = false;
  },

  handleEvent: function fk_handleEvent(evt) {
    var _ = navigator.mozL10n.get;
    switch (evt.currentTarget.id) {
      case 'feedback-happy':
      case 'feedback-sad':
        var mood = evt.currentTarget.id;
        this.feedbackObj.happy =
          (mood === 'feedback-happy');
        this.getPreviousInputs(function(value) {
          this.openFeedbackDialog(value);
        }.bind(this));
        break;
      case 'email-enable':
        this.displayEmail(this.emailEnable.checked);
        break;
      case 'feedback-send-btn':
        this.sendFeedback();
        break;
      case 'feedback-alert-btn':
        this.feedbackAlert.hidden = true;
        this.feedbackAlertMsg.textContent = '';
        break;
      case 'feedback-done-btn':
        Settings.currentPanel = 'improveBrowserOS';
        this.feedbackDone.hidden = true;
        break;
      case 'feedback-back-button':
        this.keepAllInputs();
        break;
    }
  },

  displayEmail: function fk_displayEmail(display) {
    this.emailEnable.checked = !!display;
    this.feedbackEmailbar.hidden = !display;
  },

  openFeedbackDialog: function fk_openFeedbackDialog(value) {
    Settings.currentPanel = 'improveBrowserOS-sendFeedback';

    if (!this.feedbackDialogInitFlag) {
      this.feedbackDialogInitFlag = true;
      this.feedbackAlert =
        document.getElementById('feedback-alert');
      this.feedbackAlertMsg =
        document.getElementById('feedback-alert-msg');
      this.feedbackAlertBtn =
        document.getElementById('feedback-alert-btn');
      this.feedbackDone =
        document.getElementById('feedback-done');
      this.feedbackDoneBtn =
        document.getElementById('feedback-done-btn');
      this.feedbackTitle = document.getElementById('feedback-title');
      this.feedbackDescription =
        document.getElementById('feedback-description');
      this.feedbackEmail = document.getElementById('feedback-email');
      this.feedbackEmailbar = document.getElementById('feedback-emailbar');
      this.emailEnable = document.getElementById('email-enable');
      this.sendButton = document.getElementById('feedback-send-btn');

      this.feedbackAlertBtn.addEventListener('click', this);
      this.feedbackDoneBtn.addEventListener('click', this);
      this.sendButton.addEventListener('click', this);
      this.emailEnable.addEventListener('click', this);
      document.getElementById('feedback-back-button')
              .addEventListener('click', this);
    }

    this.feedbackTitle.textContent = navigator.mozL10n.get(
      'feedback_whyfeel_' + (this.feedbackObj.happy ? 'happy' : 'sad'));
    this.feedbackDescription.value = value.description || '';
    this.feedbackEmail.value = value.email || '';
    this.displayEmail(value.emailEnable);
  },

  sendFeedback: function fk_sendFeedback(callback) {
    var self = this;
    this.sendButton.disabled = true;

    if (!navigator.onLine) {
      this.messageHandler('connect-error');
      return;
    }
    var emailBar = this.feedbackEmailbar;
    var emailInput = this.feedbackEmail;
    var contextInput = this.feedbackDescription;

    if (contextInput.textLength === 0) {
      this.messageHandler('empty-comment');
      return;
    } else {
      this.feedbackObj.description = contextInput.value;
    }

    if (!emailBar.hidden) {
      this.feedbackObj.email = emailInput.value;
    } else {
      delete this.feedbackObj.email;
    }

    if (!emailBar.hidden &&
        (!emailInput.value.length ||
        !emailInput.validity.valid)) {
      this.messageHandler('wrong-email');
      return;
    }

    var currentSetting = Settings.settingsCache;
    var feedbackUrl = currentSetting['feedback.url'];
    this.feedbackObj.version =
      currentSetting['deviceinfo.platform_build_id'];
    this.feedbackObj.device =
      currentSetting['deviceinfo.hardware'];
    this.feedbackObj.locale =
      currentSetting['language.current'];
    this.xhr = new XMLHttpRequest({mozSystem: true});
    this.xhr.open('POST', feedbackUrl, true);
    this.xhr.setRequestHeader(
      'Content-type', 'application/json');
    this.xhr.timeout = 5000;
    this.xhr.onreadystatechange = this.responseHandler.bind(this);
    this.xhr.ontimeout = function() {
      self.messageHandler('timeout');
    };
    this.xhr.send(JSON.stringify(this.feedbackObj));
  },

  responseHandler: function fk_responseHandler() {
    if (this.xhr.readyState !== 4) {
      return;
    }
    switch (this.xhr.status) {
      case 201:
        this.messageHandler('success');
        break;
      case 400:
        this.messageHandler('wrong-email');
        break;
      case 429:
        this.messageHandler('just-sent');
        break;
      case 404:
        this.messageHandler('server-off');
        break;
      default:
        this.messageHandler('connect-error');
        break;
    }
  },
  // we handle 7 types of messages as below,
  // success (feedback sent successfully),
  // connect-error, server-off, timeout,
  // wrong-email (wrong email type)
  // empty-comment (no description)
  // just-sent (send too many times)
  messageHandler: function fk_messageHandler(type) {
    var _ = navigator.mozL10n.get;
    if (type === 'success') {
      this.feedbackDone.hidden = false;
    } else {
      this.keepAllInputs();
      this.feedbackAlertMsg.textContent = _('feedback-errormessage-' + type);
      this.feedbackAlert.hidden = false;
      this.sendButton.disabled = false;
    }
    this.sendButton.disabled = false;
  },

  // we only store description, email enable flag, email address
  keepAllInputs: function fk_keepAllInputs() {
    window.asyncStorage.setItem('feedback', {
      description: this.feedbackDescription.value,
      email: this.feedbackEmail.value,
      emailEnable: !this.feedbackEmailbar.hidden
    });
  },

  getPreviousInputs: function fk_getPreviousInputs(callback) {
    window.asyncStorage.getItem('feedback', function(value) {
      callback(value || {});
    });
  }
};
navigator.mozL10n.ready(Feedback.init.bind(Feedback));
