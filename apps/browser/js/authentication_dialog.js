/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var AuthenticationDialog = {
  // Used for element id access.
  // e.g., 'authentication-dialog-alert-ok'
  prefix: 'authentication-dialog-',

  // DOM
  elements: {},

  _confirmed: {},

  // Get all elements when inited.
  getAllElements: function ad_getAllElements() {
    var elementsID = ['http-authentication', 'username-input', 'password-input',
      'http-authentication-message', 'http-authentication-ok',
      'http-authentication-cancel'];

    var toCamelCase = function toCamelCase(str) {
      return str.replace(/\-(.)/g, function replacer(str, p1) {
        return p1.toUpperCase();
      });
    };

    elementsID.forEach(function createElementRef(name) {
      this.elements[toCamelCase(name)] =
      document.getElementById(this.prefix + name);
    }, this);

    this.screen = document.getElementById('screen');
  },

  currentEvents: {},

  init: function ad_init(bindToWindow) {
    // Get all elements initially.
    this.getAllElements();
    var elements = this.elements;

    this.boundToWindow = bindToWindow || false;

    for (var id in elements) {
      if (elements[id].tagName.toLowerCase() == 'button') {
        elements[id].addEventListener('click', this);
      }
    }
  },

  // Default event handler
  handleEvent: function ad_handleEvent(evt, origin) {
    var elements = this.elements;
    switch (evt.type) {
      case 'mozbrowserusernameandpasswordrequired':
        evt.preventDefault();

        this.currentEvents[origin] = evt;

        // Show modal dialog only if
        // the frame is currently displayed.
        this.show(origin);
        break;

      case 'click':
        if (evt.currentTarget === elements.httpAuthenticationCancel) {
          this.cancelHandler();
        } else {
          this.confirmHandler();
        }
        break;
    }
  },

  // Show relative dialog and set message/input value well
  show: function ad_show(origin) {
    this.currentOrigin = origin;
    var evt = this.currentEvents[origin];

    var message = evt.detail.message;
    var elements = this.elements;
    this.screen.classList.add('authentication-dialog');
    elements.httpAuthentication.classList.add('visible');

    var _ = navigator.mozL10n.get;

    // XXX: We don't have a better way to detect login failed.
    if (this._confirmed[origin]) {
      message = _('the-username-or-password-is-incorrect');
      elements.httpAuthenticationMessage.classList.add('error');
    } else {
      var l10nArgs = { host: evt.detail.host };
      message = _('http-authentication-message', l10nArgs);
      elements.httpAuthenticationMessage.classList.remove('error');
    }
    elements.httpAuthenticationMessage.textContent = message;

    elements.usernameInput.value = '';
    elements.passwordInput.value = '';
    elements.usernameInput.focus();
  },

  hide: function ad_hide() {
    var evt = this.currentEvents[this.currentOrigin];
    if (!evt)
      return;
    this.elements.httpAuthentication.classList.remove('visible');
    this.currentOrigin = null;
    this.screen.classList.remove('authentication-dialog');
  },

  // When user clicks OK button on alert/confirm/prompt
  confirmHandler: function ad_confirmHandler() {
    var elements = this.elements;

    var evt = this.currentEvents[this.currentOrigin];
    evt.detail.authenticate(elements.usernameInput.value,
      elements.passwordInput.value);
    elements.httpAuthentication.classList.remove('visible');

    // To remember we had ever logged in.
    this._confirmed[this.currentOrigin] = true;

    delete this.currentEvents[this.currentOrigin];
    this.screen.classList.remove('authentication-dialog');
  },

  // When user clicks cancel button on confirm/prompt or
  // when the user try to escape the dialog with the escape key
  cancelHandler: function ad_cancelHandler() {
    var evt = this.currentEvents[this.currentOrigin];
    var elements = this.elements;

    evt.detail.cancel();

    if (this._confirmed[this.currentOrigin])
      delete this._confirmed[this.currentOrigin];

    delete this.currentEvents[this.currentOrigin];
    this.screen.classList.remove('authentication-dialog');
  },

  originHasEvent: function(origin) {
    return origin in this.currentEvents;
  }
};
