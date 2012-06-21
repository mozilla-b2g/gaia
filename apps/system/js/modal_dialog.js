/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// The modal dialog listen to mozbrowsershowmodalprompt event.
// Blocking the current app and then show cutom modal dialog
// (alert/confirm/prompt)

var ModalDialog = {
  // this attribute indicates if modal dialog is shown now.
  blocked: false,

  // Used for element id access.
  // e.g., 'modal-dialog-alert-ok'
  prefix: 'modal-dialog-',

  // DOM
  elements: ['alert', 'alert-ok', 'alert-message',
    'prompt', 'prompt-ok', 'prompt-cancel', 'prompt-input', 'prompt-message',
    'confirm', 'confirm-ok', 'confirm-cancel', 'confirm-message'],

  // Get all elements when inited.
  getAllElements: function md_getAllElements() {
    var toCamelCase = function toCamelCase(str) {
      return str.replace(/\-(.)/g, function replacer(str, p1) {
        return p1.toUpperCase();
      });
    };

    // Loop and add element with camel style name to Modal Dialog attribute.
    this.elements.forEach(function createElementRef(name) {
      this[toCamelCase(name)] = document.getElementById(this.prefix + name);
    }, this);

    this.overlay = document.getElementById('modal-dialog');
  },

  // Save the event returned by mozbrowsershowmodalprompt for later use.
  evt: null,

  init: function md_init() {
    // Get all elements initially.
    this.getAllElements();

    // Bind events
    window.addEventListener('mozbrowsershowmodalprompt', this);
    this.alertOk.addEventListener('click', this);
    this.confirmOk.addEventListener('click', this);
    this.confirmCancel.addEventListener('click', this);
    this.promptOk.addEventListener('click', this);
    this.promptCancel.addEventListener('click', this);
  },

  // Default event handler
  handleEvent: function md_handleEvent(evt) {
    switch (evt.type) {
      case 'mozbrowsershowmodalprompt':
        evt.preventDefault();
        this.overlay.classList.add('visible');
        this.blocked = true;

        // check if there is another modal dialog now.
        // unblock the previous mozbrowsershowmodalprompt event
        if (this.evt) {
          this.evt.detail.unblock();
        }

        this.evt = evt;
        this.show();
        break;

      case 'click':
        if (evt.currentTarget === this.confirmCancel ||
            evt.currentTarget === this.promptCancel) {
          this.cancelHandler();
        } else {
          this.confirmHandler();
        }
        break;
    }
  },

  // Show relative dialog and set message/input value well
  show: function md_show() {
      var message = this.evt.detail.message;

      switch (this.evt.detail.promptType) {
        case 'alert':
          this.alertMessage.textContent = message;
          this.alert.classList.add('visible');
          break;

        case 'prompt':
          this.prompt.classList.add('visible');
          this.promptInput.value = this.evt.detail.initialValue;
          this.promptMessage.textContent = message;
          break;

        case 'confirm':
          this.confirm.classList.add('visible');
          this.confirmMessage.textContent = message;
          break;
      }
  },

  // When user clicks OK button on alert/confirm/prompt
  confirmHandler: function md_confirmHandler() {
    this.overlay.classList.remove('visible');

    switch (this.evt.detail.promptType) {
      case 'alert':
        this.alert.classList.remove('visible');
        break;

      case 'prompt':
        this.evt.detail.returnValue = this.promptInput.value;
        this.prompt.classList.remove('visible');
        break;

      case 'confirm':
        this.evt.detail.returnValue = true;
        this.confirm.classList.remove('visible');
        break;
    }

    if (this.evt.isPseudo && this.evt.callback) {
      this.evt.callback(this.evt.detail.returnValue);
    }

    this.evt.detail.unblock();

    // Let WindowManager know it can return to home now.
    this.blocked = false;
    this.evt = null;
  },

  // When user clicks cancel button on confirm/prompt or
  // when the user try to escape the dialog with the escape key
  cancelHandler: function md_cancelHandler() {
    this.overlay.classList.remove('visible');

    switch (this.evt.detail.promptType) {
      case 'alert':
        this.alert.classList.remove('visible');
        break;

      case 'prompt':
        /* return null when click cancel */
        this.evt.detail.returnValue = null;
        this.prompt.classList.remove('visible');
        break;

      case 'confirm':
        /* return false when click cancel */
        this.evt.detail.returnValue = false;
        this.confirm.classList.remove('visible');
        break;
    }

    if (this.evt.isPseudo && this.evt.callback) {
      this.evt.callback(this.evt.detail.returnValue);
    }

    this.evt.detail.unblock();

    // Let WindowManager know it can return to home now.
    this.blocked = false;
    this.evt = null;
  },

  alert: function(text, callback) {
    this.makePseudoEvent({
      type: 'alert',
      text: text,
      callback: callback
    });
  },

  confirm: function(text, callback, cancel) {
    this.makePseudoEvent({
      type: 'alert',
      text: text,
      callback: callback,
      cancel: cancel
    });
  },

  prompt: function(text, default_value, callback) {
    this.makePseudoEvent({
      type: 'alert',
      text: text,
      initialValue: default_value,
      callback: callback
    });
  },

  makePseudoEvent: function(configuration) {
    if (this.evt) {
      this.evt.detail.unblock();
    }

    var pseudo_evt = {
      isPseudo: true,
      detail: {
        unblock: null
      }
    };

    pseudo_evt.detail.message = configuration.text;
    pseudo_evt.callback = configuration.callback;
    switch (configuration.type) {
      case 'alert':
        break;
      case 'confirm':
        break;
      case 'prompt':
        pseudo_evt.detail.initialValue = configuration.initialValue;
        break;
    }
    this.evt = pseudo_evt;
    this.show();
  }
};

ModalDialog.init();
