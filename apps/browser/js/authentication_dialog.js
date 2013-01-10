/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var AuthenticationDialog = {

  _confirmed: {},

  // Get all elements when inited.
  getAllElements: function ad_getAllElements() {

    var toCamelCase = function toCamelCase(str) {
      return str.replace(/\-(.)/g, function replacer(str, p1) {
        return p1.toUpperCase();
      });
    };

    var elementIDs = [
      'http-authentication-dialog', 'http-authentication-username',
      'http-authentication-password', 'http-authentication-message',
      'http-authentication-ok', 'http-authentication-cancel'];

    // Loop and add element with camel style name to Modal Dialog attribute.
    elementIDs.forEach(function createElementRef(name) {
      this[toCamelCase(name)] = document.getElementById(name);
    }, this);
  },

  currentEvents: {},

  init: function ad_init(bindToWindow) {
    // Get all elements initially.
    this.getAllElements();
    var elements = this.elements;

    this.boundToWindow = bindToWindow || false;

    this.httpAuthenticationOk.addEventListener('click', this);
    this.httpAuthenticationCancel.addEventListener('click', this);
  },

  // Default event handler
  handleEvent: function ad_handleEvent(evt, origin) {
    switch (evt.type) {
      case 'mozbrowserusernameandpasswordrequired':
        evt.preventDefault();

        this.currentEvents[origin] = evt;

        // Show authentication dialog only if
        // the frame is currently displayed.
        this.show(origin);
        break;

      case 'click':
        if (evt.currentTarget === this.httpAuthenticationCancel) {
          this.cancelHandler();
        } else {
          this.confirmHandler();
        }
        break;
    }
  },

  // Show dialog and set message
  show: function ad_show(origin) {
    this.currentOrigin = origin;
    var evt = this.currentEvents[origin];

    var message = evt.detail.message;
    this.httpAuthenticationDialog.classList.remove('hidden');

    var _ = navigator.mozL10n.get;

    // XXX: We don't have a better way to detect login failed.
    if (this._confirmed[origin]) {
      message = _('the-username-or-password-is-incorrect');
      this.httpAuthenticationMessage.classList.add('error');
    } else {
      var l10nArgs = { host: evt.detail.host };
      message = _('http-authentication-message', l10nArgs);
      this.httpAuthenticationMessage.classList.remove('error');
    }
    this.httpAuthenticationMessage.textContent = message;

    this.httpAuthenticationUsername.value = '';
    this.httpAuthenticationPassword.value = '';
    this.httpAuthenticationUsername.focus();
  },

  hide: function ad_hide() {
    var evt = this.currentEvents[this.currentOrigin];
    if (!evt)
      return;
    this.httpAuthenticationDialog.classList.add('hidden');
    this.currentOrigin = null;
  },

  // When user clicks OK button on authentication dialog
  confirmHandler: function ad_confirmHandler() {
    var evt = this.currentEvents[this.currentOrigin];
    evt.detail.authenticate(this.httpAuthenticationUsername.value,
      this.httpAuthenticationPassword.value);
    this.httpAuthenticationDialog.classList.add('hidden');

    // To remember we had ever logged in.
    this._confirmed[this.currentOrigin] = true;

    delete this.currentEvents[this.currentOrigin];
  },

  // When user clicks cancel button on authentication dialog or
  // when the user try to escape the dialog with the escape key
  cancelHandler: function ad_cancelHandler() {
    var evt = this.currentEvents[this.currentOrigin];

    evt.detail.cancel();

    if (this._confirmed[this.currentOrigin])
      delete this._confirmed[this.currentOrigin];

    delete this.currentEvents[this.currentOrigin];
    this.httpAuthenticationDialog.classList.add('hidden');
  },

  originHasEvent: function(origin) {
    return origin in this.currentEvents;
  },

  clear: function ad_clear(origin) {
    if (this.currentEvents[origin])
      delete this.currentEvents[origin];
  }
};
