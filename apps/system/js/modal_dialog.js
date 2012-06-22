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
  elements: {},

  // Get all elements when inited.
  getAllElements: function md_getAllElements() {
    var elementsID = ['alert', 'alert-ok', 'alert-message',
      'prompt', 'prompt-ok', 'prompt-cancel', 'prompt-input', 'prompt-message',
      'confirm', 'confirm-ok', 'confirm-cancel', 'confirm-message'];

    var toCamelCase = function toCamelCase(str) {
      return str.replace(/\-(.)/g, function replacer(str, p1) {
        return p1.toUpperCase();
      });
    };

    // Loop and add element with camel style name to Modal Dialog attribute.
    elementsID.forEach(function createElementRef(name) {
      this.elements[toCamelCase(name)] =
        document.getElementById(this.prefix + name);
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
    this.elements.alertOk.addEventListener('click', this);
    this.elements.confirmOk.addEventListener('click', this);
    this.elements.confirmCancel.addEventListener('click', this);
    this.elements.promptOk.addEventListener('click', this);
    this.elements.promptCancel.addEventListener('click', this);
  },

  // Default event handler
  handleEvent: function md_handleEvent(evt) {
    switch (evt.type) {
      case 'mozbrowsershowmodalprompt':
        evt.preventDefault();
        this.blocked = true;

        // check if there is another modal dialog now.
        // unblock the previous mozbrowsershowmodalprompt event
        if (this.evt && this.evt.detail.unblock) {
          this.evt.detail.unblock();
        }

        this.evt = evt;
        this.show();
        break;

      case 'click':
        if (evt.currentTarget === this.elements.confirmCancel ||
            evt.currentTarget === this.elements.promptCancel) {
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
      this.overlay.classList.add('visible');

      switch (this.evt.detail.promptType) {
        case 'alert':
          this.elements.alertMessage.textContent = message;
          this.elements.alert.classList.add('visible');
          break;

        case 'prompt':
          this.elements.prompt.classList.add('visible');
          this.elements.promptInput.value = this.evt.detail.initialValue;
          this.elements.promptMessage.textContent = message;
          break;

        case 'confirm':
          this.elements.confirm.classList.add('visible');
          this.elements.confirmMessage.textContent = message;
          break;
      }
  },

  // When user clicks OK button on alert/confirm/prompt
  confirmHandler: function md_confirmHandler() {
    this.overlay.classList.remove('visible');

    switch (this.evt.detail.promptType) {
      case 'alert':
        this.elements.alert.classList.remove('visible');
        break;

      case 'prompt':
        this.evt.detail.returnValue = this.promptInput.value;
        this.elements.prompt.classList.remove('visible');
        break;

      case 'confirm':
        this.evt.detail.returnValue = true;
        this.elements.confirm.classList.remove('visible');
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
        this.elements.alert.classList.remove('visible');
        break;

      case 'prompt':
        /* return null when click cancel */
        this.evt.detail.returnValue = null;
        this.elements.prompt.classList.remove('visible');
        break;

      case 'confirm':
        /* return false when click cancel */
        this.evt.detail.returnValue = false;
        this.elements.confirm.classList.remove('visible');
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

  // The below is for system apps to use.
  alert: function md_alert(text, callback) {
    this.makePseudoEvent({
      type: 'alert',
      text: text,
      callback: callback
    });
  },

  confirm: function md_confirm(text, callback, cancel) {
    this.makePseudoEvent({
      type: 'confirm',
      text: text,
      callback: callback,
      cancel: cancel
    });
  },

  prompt: function md_prompt(text, default_value, callback) {
    this.makePseudoEvent({
      type: 'prompt',
      text: text,
      initialValue: default_value,
      callback: callback
    });
  },

  showWithPseudoEvent: function md_showWithPseudoEvent(config) {
    if (this.evt && this.evt.detail.unblock) {
      this.evt.detail.unblock();
    }

    var pseudoEvt = {
      isPseudo: true,
      detail: {
        unblock: null
      }
    };

    pseudoEvt.detail.message = config.text;
    pseudoEvt.callback = config.callback;
    pseudoEvt.detail.promptType = config.type;
    if (config.type == 'prompt') {
        pseudoEvt.detail.initialValue = config.initialValue;
    }
    this.evt = pseudoEvt;
    this.show();
  }
};

ModalDialog.init();
