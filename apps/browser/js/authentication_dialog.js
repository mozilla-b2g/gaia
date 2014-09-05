/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/* exported AuthenticationDialog */

/**
 * Handles mozbrowserusernameandpasswordrequired event and show
 * authentication dialog.
 * @namespace AuthenticationDialog
 */
var AuthenticationDialog = {

  _confirmed: {},

  /** Get all DOM elements when inited. */
  getAllElements: function ad_getAllElements() {

    var toCamelCase = function toCamelCase(str) {
      return str.replace(/\-(.)/g, function replacer(str, p1) {
        return p1.toUpperCase();
      });
    };

    var elementIDs = [
      'http-authentication-dialog', 'http-authentication-username',
      'http-authentication-password', 'http-authentication-message',
      'http-authentication-ok', 'http-authentication-header'];

    // Loop and add element with camel style name to Modal Dialog attribute.
    elementIDs.forEach(function createElementRef(name) {
      this[toCamelCase(name)] = document.getElementById(name);
    }, this);
  },

  currentEvents: {},

  /** Initialization. Get elements and add listeners. */
  init: function ad_init(bindToWindow) {
    // Get all elements initially.
    this.getAllElements();

    this.boundToWindow = bindToWindow || false;

    this.httpAuthenticationOk.addEventListener('click', this);
    this.httpAuthenticationHeader.addEventListener('action', this);
  },

  /**
   * Default event handler for mozbrowser event and click event.
   * @param {Event} evt
   * @param {String} origin Tab ID
   */
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
        if (evt.currentTarget === this.httpAuthenticationHeader) {
          this.cancelHandler();
        } else {
          this.confirmHandler();
        }
        break;
    }
  },

  /**
   * Show dialog and set message.
   * @param {String} origin Tab ID
   */
  show: function ad_show(origin) {
    this.currentOrigin = origin;
    var evt = this.currentEvents[origin];

    this.httpAuthenticationDialog.classList.remove('hidden');

    // XXX: We don't have a better way to detect login failed.
    if (this._confirmed[origin]) {
      this.httpAuthenticationMessage.setAttribute('data-l10n-id',
        'the-username-or-password-is-incorrect');
      this.httpAuthenticationMessage.classList.add('error');
    } else {
      navigator.mozL10n.setAttributes(this.httpAuthenticationMessage,
                                      'http-authentication-message',
                                      { host: evt.detail.host });
      this.httpAuthenticationMessage.classList.remove('error');
    }

    this.httpAuthenticationUsername.value = '';
    this.httpAuthenticationPassword.value = '';
    this.httpAuthenticationUsername.focus();
  },

  /** Hide authentication dialog. */
  hide: function ad_hide() {
    var evt = this.currentEvents[this.currentOrigin];
    if (!evt) {
      return;
    }
    this.httpAuthenticationDialog.classList.add('hidden');
    this.currentOrigin = null;
  },

  /**
   * When user clicks OK button on authentication dialog,
   * authenticate user.
   */
  confirmHandler: function ad_confirmHandler() {
    var evt = this.currentEvents[this.currentOrigin];
    evt.detail.authenticate(this.httpAuthenticationUsername.value,
      this.httpAuthenticationPassword.value);
    this.httpAuthenticationDialog.classList.add('hidden');

    // To remember we had ever logged in.
    this._confirmed[this.currentOrigin] = true;

    delete this.currentEvents[this.currentOrigin];
  },

  /**
   * When user clicks cancel button on authentication dialog or
   * when the user try to escape the dialog with the escape key,
   * cancel authentication.
   */
  cancelHandler: function ad_cancelHandler() {
    var evt = this.currentEvents[this.currentOrigin];

    evt.detail.cancel();

    if (this._confirmed[this.currentOrigin]) {
      delete this._confirmed[this.currentOrigin];
    }

    delete this.currentEvents[this.currentOrigin];
    this.httpAuthenticationDialog.classList.add('hidden');
  },

  /**
   * Check if the specified tab currently has any event.
   * @param {String} origin Tab ID
   */
  originHasEvent: function(origin) {
    return origin in this.currentEvents;
  },

  /**
   * Clear events of the specified tab ID.
   * @param {String} origin Tab ID
   */
  clear: function ad_clear(origin) {
    if (this.currentEvents[origin]) {
      delete this.currentEvents[origin];
    }
  }
};
