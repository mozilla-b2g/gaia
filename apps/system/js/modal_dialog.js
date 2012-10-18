/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// The modal dialog listen to mozbrowsershowmodalprompt event.
// Blocking the current app and then show cutom modal dialog
// (alert/confirm/prompt)

var ModalDialog = {
  // Used for element id access.
  // e.g., 'modal-dialog-alert-ok'
  prefix: 'modal-dialog-',

  // DOM
  elements: {},

  // Get all elements when inited.
  getAllElements: function md_getAllElements() {
    var elementsID = ['alert', 'alert-ok', 'alert-message',
      'prompt', 'prompt-ok', 'prompt-cancel', 'prompt-input', 'prompt-message',
      'confirm', 'confirm-ok', 'confirm-cancel', 'confirm-message',
      'error', 'error-back', 'error-reload', 'select-one', 'select-one-cancel',
      'select-one-menu', 'select-one-title'];

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

    this.screen = document.getElementById('screen');
    this.overlay = document.getElementById('dialog-overlay');
  },

  // Save the events returned by mozbrowsershowmodalprompt for later use.
  // The events are stored according to webapp origin
  // e.g., 'http://uitest.gaiamobile.org': evt
  currentEvents: {},

  init: function md_init() {
    // Get all elements initially.
    this.getAllElements();
    var elements = this.elements;

    // Bind events
    window.addEventListener('mozbrowsershowmodalprompt', this);
    window.addEventListener('mozbrowsererror', this);
    window.addEventListener('appopen', this);
    window.addEventListener('appwillclose', this);
    window.addEventListener('appterminated', this);
    window.addEventListener('resize', this);
    window.addEventListener('keyboardchange', this);
    window.addEventListener('keyboardhide', this);
    window.addEventListener('home', this);
    window.addEventListener('holdhome', this);

    for (var id in elements) {
      var tagName = elements[id].tagName.toLowerCase();
      if (tagName == 'button' || tagName == 'ul') {
        elements[id].addEventListener('click', this);
      }
    }
  },

  // Default event handler
  handleEvent: function md_handleEvent(evt) {
    var elements = this.elements;
    switch (evt.type) {
      case 'mozbrowsererror':
      case 'mozbrowsershowmodalprompt':
        var frameType = evt.target.dataset.frameType;
        if (frameType != 'window' && frameType != 'inline-activity')
          return;

        /* fatal case (App crashing) is handled in Window Manager */
        if (evt.type == 'mozbrowsererror' && evt.detail.type == 'fatal')
          return;

        evt.preventDefault();
        var origin = evt.target.dataset.frameOrigin;
        this.currentEvents[origin] = evt;

        // Show modal dialog only if
        // the frame is currently displayed.
        if (origin == WindowManager.getDisplayedApp() ||
            frameType == 'inline-activity')
          this.show(origin);
        break;

      case 'click':
        if (evt.currentTarget === elements.errorBack) {
          this.cancelHandler();
          WindowManager.kill(this.currentOrigin);
        } else if (evt.currentTarget === elements.errorReload) {
          this.cancelHandler();
          WindowManager.reload(this.currentOrigin);
        } else if (evt.currentTarget === elements.confirmCancel ||
          evt.currentTarget === elements.promptCancel ||
          evt.currentTarget === elements.selectOneCancel) {
          this.cancelHandler();
        } else if (evt.currentTarget === elements.selectOneMenu) {
          this.selectOneHandler(evt.target);
        } else {
          this.confirmHandler();
        }
        break;

      case 'appopen':
        this.show(evt.detail.origin);
        break;

      case 'home':
      case 'holdhome':
        // Inline activity, which origin is different from foreground app
        if (this.isVisible() &&
            this.currentOrigin != WindowManager.getDisplayedApp())
          this.cancelHandler();
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
        this.setHeight(window.innerHeight -
          evt.detail.height - StatusBar.height);
        break;
    }
  },

  setHeight: function md_setHeight(height) {
    if (this.isVisible())
      this.overlay.style.height = height + 'px';
  },

  // Show relative dialog and set message/input value well
  show: function md_show(origin) {
    this.currentOrigin = origin;
    var evt = this.currentEvents[origin];

    var message = evt.detail.message || '';
    var elements = this.elements;
    this.screen.classList.add('modal-dialog');

    function escapeHTML(str) {
      var span = document.createElement('span');
      span.textContent = str;
      // Escape space for displaying multiple space in message.
      span.innerHTML = span.innerHTML.replace(/\n/g, '<br/>');
      return span.innerHTML;
    }

    var type = evt.detail.promptType || evt.detail.type;
    if (type !== 'selectone') {
      message = escapeHTML(message);
    }

    switch (type) {
      case 'alert':
        elements.alertMessage.innerHTML = message;
        elements.alert.classList.add('visible');
        break;

      case 'prompt':
        elements.prompt.classList.add('visible');
        elements.promptInput.value = evt.detail.initialValue;
        elements.promptMessage.innerHTML = message;
        break;

      case 'confirm':
        elements.confirm.classList.add('visible');
        elements.confirmMessage.innerHTML = message;
        break;

      case 'selectone':
        this.buildSelectOneDialog(message);
        elements.selectOne.classList.add('visible');
        break;

      // Error
      case 'other':
        elements.error.classList.add('visible');
        break;
    }

    this.setHeight(window.innerHeight - StatusBar.height);
  },

  hide: function md_hide() {
    var evt = this.currentEvents[this.currentOrigin];
    var type = evt.detail.promptType || evt.detail.type;
    if (type == 'prompt') {
      this.elements.promptInput.blur();
    }
    this.currentOrigin = null;
    this.screen.classList.remove('modal-dialog');
    this.elements[type].classList.remove('visible');
  },

  // When user clicks OK button on alert/confirm/prompt
  confirmHandler: function md_confirmHandler() {
    this.screen.classList.remove('modal-dialog');
    var elements = this.elements;

    var evt = this.currentEvents[this.currentOrigin];

    var type = evt.detail.promptType || evt.detail.type;
    switch (type) {
      case 'alert':
        elements.alert.classList.remove('visible');
        break;

      case 'prompt':
        evt.detail.returnValue = elements.promptInput.value;
        elements.prompt.classList.remove('visible');
        break;

      case 'confirm':
        evt.detail.returnValue = true;
        elements.confirm.classList.remove('visible');
        break;

      case 'other':
        elements.error.classList.remove('visible');
        break;
    }

    if (evt.isPseudo && evt.callback) {
      evt.callback(evt.detail.returnValue);
    }

    if (evt.detail.unblock)
      evt.detail.unblock();

    delete this.currentEvents[this.currentOrigin];
  },

  // When user clicks cancel button on confirm/prompt or
  // when the user try to escape the dialog with the escape key
  cancelHandler: function md_cancelHandler() {
    var evt = this.currentEvents[this.currentOrigin];
    this.screen.classList.remove('modal-dialog');
    var elements = this.elements;

    var type = evt.detail.promptType || evt.detail.type;
    switch (type) {
      case 'alert':
        elements.alert.classList.remove('visible');
        break;

      case 'prompt':
        /* return null when click cancel */
        evt.detail.returnValue = null;
        elements.prompt.classList.remove('visible');
        break;

      case 'confirm':
        /* return false when click cancel */
        evt.detail.returnValue = false;
        elements.confirm.classList.remove('visible');
        break;

      case 'selectone':
        /* return null when click cancel */
        evt.detail.returnValue = null;
        elements.selectOne.classList.remove('visible');
        break;

      case 'other':
        elements.error.classList.remove('visible');
        break;
    }

    if (evt.isPseudo && evt.callback) {
      evt.callback(evt.detail.returnValue);
    }

    if (evt.detail.unblock)
      evt.detail.unblock();

    delete this.currentEvents[this.currentOrigin];
  },

  // When user selects an option on selectone dialog
  selectOneHandler: function md_confirmHandler(target) {
    this.screen.classList.remove('modal-dialog');
    var elements = this.elements;

    var evt = this.currentEvents[this.currentOrigin];

    evt.detail.returnValue = target.id;
    elements.selectOne.classList.remove('visible');

    if (evt.isPseudo && evt.callback) {
      evt.callback(evt.detail.returnValue);
    }

    if (evt.detail.unblock)
      evt.detail.unblock();

    delete this.currentEvents[this.currentOrigin];
  },

  buildSelectOneDialog: function md_buildSelectOneDialog(data) {
    var elements = this.elements;
    elements.selectOneTitle.textContent = data.title;
    elements.selectOneMenu.innerHTML = '';

    if (!data.options) {
      return;
    }

    var itemsHTML = [];
    for (var i = 0; i < data.options.length; i++) {
      itemsHTML.push('<li><button id="');
      itemsHTML.push(data.options[i].id);
      itemsHTML.push('">');
      itemsHTML.push(data.options[i].text);
      itemsHTML.push('</button></li>');
    }

    elements.selectOneMenu.innerHTML = itemsHTML.join('');
  },

  // The below is for system apps to use.
  alert: function md_alert(text, callback) {
    this.showWithPseudoEvent({
      type: 'alert',
      text: text,
      callback: callback
    });
  },

  confirm: function md_confirm(text, callback, cancel) {
    this.showWithPseudoEvent({
      type: 'confirm',
      text: text,
      callback: callback,
      cancel: cancel
    });
  },

  prompt: function md_prompt(text, default_value, callback) {
    this.showWithPseudoEvent({
      type: 'prompt',
      text: text,
      initialValue: default_value,
      callback: callback
    });
  },

  selectOne: function md_alert(data, callback) {
    this.showWithPseudoEvent({
      type: 'selectone',
      text: data,
      callback: callback
    });
  },

  showWithPseudoEvent: function md_showWithPseudoEvent(config) {
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

    // Create a virtual mapping in this.currentEvents,
    // since system-app uses the different way to call ModalDialog.
    this.currentEvents['system'] = pseudoEvt;
    this.show('system');
  },

  isVisible: function md_isVisible() {
    return this.screen.classList.contains('modal-dialog');
  }
};

ModalDialog.init();
