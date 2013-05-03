/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// This module listens to mozbrowserusernameandpasswordrequired event.
// It's for http authentication only.
// XXX: ftp authentication will be implemented here but not supported yet.

var AuthenticationDialog = {
  // Used for element id access.
  // e.g., 'authentication-dialog-alert-ok'
  prefix: 'authentication-dialog-',

  // DOM
  elements: {},

  // Get all elements when inited.
  getAllElements: function ad_getAllElements() {
    var elementsID = [
      'http-authentication', 'http-username-input', 'http-password-input',
      'http-authentication-message', 'http-authentication-ok',
      'http-authentication-cancel', 'title'
    ];

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
    this.overlay = document.getElementById('dialog-overlay');
  },

  // Save the events returned by
  // mozbrowserusernameandpasswordrequired for later use.
  // The events are stored according to webapp origin
  // e.g., 'http://uitest.gaiamobile.org': evt
  currentEvents: {},

  init: function ad_init() {
    // Get all elements initially.
    this.getAllElements();
    var elements = this.elements;

    // Bind events
    window.addEventListener('mozbrowserusernameandpasswordrequired', this);
    window.addEventListener('appopen', this);
    window.addEventListener('appwillclose', this);
    window.addEventListener('appterminated', this);
    window.addEventListener('resize', this);
    window.addEventListener('keyboardchange', this);
    window.addEventListener('keyboardhide', this);

    for (var id in elements) {
      if (elements[id].tagName.toLowerCase() == 'button') {
        elements[id].addEventListener('click', this);
      }
    }
  },

  // Default event handler
  handleEvent: function ad_handleEvent(evt) {
    var elements = this.elements;
    switch (evt.type) {
      case 'mozbrowserusernameandpasswordrequired':
        if (evt.target.dataset.frameType != 'window')
          return;

        evt.preventDefault();
        var origin = evt.target.dataset.frameOrigin;
        this.currentEvents[origin] = evt;

        if (origin == WindowManager.getDisplayedApp())
          this.show(origin);
        break;

      case 'click':
        if (evt.currentTarget === elements.httpAuthenticationCancel) {
          this.cancelHandler();
        } else {
          this.confirmHandler();
        }
        break;

      case 'appopen':
        if (this.currentEvents[evt.detail.origin])
          this.show(evt.detail.origin);
        break;

      case 'appwillclose':
        // Do nothing if the app is closed at background.
        if (evt.detail.origin !== this.currentOrigin)
          return;

        // Reset currentOrigin
        this.hide();
        break;

      case 'appterminated':
        if (this.currentEvents[evt.detail.origin])
          delete this.currentEvents[evt.detail.origin];

        break;

      case 'resize':
      case 'keyboardhide':
        if (!this.currentOrigin)
          return;

        this.setHeight(window.innerHeight - StatusBar.height);
        break;

      case 'keyboardchange':
        var keyboardHeight = KeyboardManager.getHeight();
        this.setHeight(window.innerHeight - keyboardHeight - StatusBar.height);
        break;
    }
  },

  setHeight: function ad_setHeight(height) {
    if (this.isVisible())
      this.overlay.style.height = height + 'px';
  },

  show: function ad_show(origin) {
    this.currentOrigin = origin;
    var evt = this.currentEvents[origin];
    var elements = this.elements;
    this.screen.classList.add('authentication-dialog');
    elements.httpAuthentication.classList.add('visible');
    elements.title.textContent = evt.detail.host;
    elements.httpAuthenticationMessage.textContent = evt.detail.realm;
    elements.httpUsernameInput.value = '';
    elements.httpPasswordInput.value = '';

    this.setHeight(window.innerHeight - StatusBar.height);
  },

  hide: function ad_hide() {
    this.elements.httpUsernameInput.blur();
    this.elements.httpPasswordInput.blur();
    this.currentOrigin = null;
    this.elements.httpAuthentication.classList.remove('visible');
    this.screen.classList.remove('authentication-dialog');
  },

  confirmHandler: function ad_confirmHandler() {
    var elements = this.elements;
    var evt = this.currentEvents[this.currentOrigin];
    evt.detail.authenticate(elements.httpUsernameInput.value,
      elements.httpPasswordInput.value);
    elements.httpAuthentication.classList.remove('visible');
    delete this.currentEvents[this.currentOrigin];
    this.screen.classList.remove('authentication-dialog');
  },

  cancelHandler: function ad_cancelHandler() {
    var evt = this.currentEvents[this.currentOrigin];
    var elements = this.elements;
    evt.detail.cancel();
    elements.httpAuthentication.classList.remove('visible');
    delete this.currentEvents[this.currentOrigin];
    this.screen.classList.remove('authentication-dialog');
  },

  isVisible: function ad_isVisible() {
    return this.screen.classList.contains('authentication-dialog');
  }
};

AuthenticationDialog.init();
