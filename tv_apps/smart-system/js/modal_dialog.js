/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/* global KeyboardManager, focusManager, Sanitizer, SharedUtils */

// The modal dialog listen to mozbrowsershowmodalprompt event.
// Blocking the current app and then show cutom modal dialog
// (alert/confirm/prompt)

var ModalDialog = {
  // Used for element id access.
  // e.g., 'modal-dialog-alert-ok'
  prefix: 'modal-dialog-',

  // DOM
  elements: {},

  dialog: document.getElementById('modal-dialog'),

  // Get all elements when inited.
  getAllElements: function md_getAllElements() {
    var elementsID = [
      'select-one', 'select-one-cancel', 'select-one-menu', 'select-one-title'];

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
  // The events are stored according to webapp origin and in some edge cases
  // (in particular related to system messages) we have to handle multiple
  // events for one origin, so we queue them.
  // e.g., 'http://uitest.gaiamobile.org': [evt]
  currentEvents: {},

  get eventForCurrentOrigin() {
    var originEvents = this.currentEvents[this.currentOrigin];
    if (originEvents && originEvents.length) {
      return originEvents[0];
    }

    return null;
  },

  init: function md_init() {
    // Get all elements initially.
    this.getAllElements();
    var elements = this.elements;

    // Bind events
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
    this.smartModalDialog = SharedUtils.createSmartDialog('modal', this.dialog);
    this.smartInputDialog = SharedUtils.createSmartDialog('input', this.dialog);
    // XXX: we just hide the clear button to screen reader.
    this.smartInputDialog.clearButton.setAttribute('aria-hidden', true);
    this.dialog.addEventListener('modal-dialog-will-open', this);
    this.dialog.addEventListener('modal-dialog-closed', this);
    focusManager.addUI(this);
  },

  // Default event handler
  handleEvent: function md_handleEvent(evt) {
    var elements = this.elements;
    switch (evt.type) {
      case 'click':
        if (evt.currentTarget === elements.selectOneCancel) {
          this.cancelHandler();
        } else if (evt.currentTarget === elements.selectOneMenu) {
          this.selectOneHandler(evt.target);
        } else {
          this.confirmHandler();
        }
        break;

      case 'appopen':
        this.show(evt.target, evt.detail.origin);
        break;

      case 'home':
      case 'holdhome':
        // Inline activity, which origin is different from foreground app
        if (this.isVisible()) {
          this.cancelHandler();
        }
        break;

      case 'appwillclose':
        // Do nothing if the app is closed at background.
        if (evt.detail.origin !== this.currentOrigin) {
          return;
        }

        // Reset currentOrigin
        this.hide();
        break;

      case 'appterminated':
        if (this.currentEvents[evt.detail.origin]) {
          delete this.currentEvents[evt.detail.origin];
        }

        break;

      case 'resize':
      case 'keyboardhide':
        if (!this.currentOrigin) {
          return;
        }

        this.setHeight(window.innerHeight);
        break;

      case 'keyboardchange':
        var keyboardHeight = KeyboardManager.getHeight();
        this.setHeight(window.innerHeight - keyboardHeight);
        break;
      case 'modal-dialog-will-open':
      case 'modal-dialog-closed':
        focusManager.focus();
        break;
    }
  },

  processNextEvent: function md_processNextEvent() {
    var originEvents = this.currentEvents[this.currentOrigin];

    originEvents.splice(0, 1);

    if (originEvents.length) {
      this.show(null, this.currentOrigin);
      return;
    }

    delete this.currentEvents[this.currentOrigin];
  },

  setHeight: function md_setHeight(height) {
    if (this.isVisible()) {
      this.overlay.style.height = height + 'px';
    }
  },

  // Show relative dialog and set message/input value well
  show: function md_show(target, origin) {
    if (!(origin in this.currentEvents)) {
      return;
    }

    this.currentOrigin = origin;
    var evt = this.eventForCurrentOrigin;

    var message = evt.detail.message || '';
    var title = evt.detail.title || '';
    var elements = this.elements;
    this.screen.classList.add('modal-dialog');

    var type = evt.detail.promptType || evt.detail.type;

    // XXX: Bug 916658 - Remove unused l10n resources from b2g gecko
    // If we have removed translations from Gecko, then we can remove this.
    if (target && target.dataset.frameType === 'window') {
      title = '';
    }

    switch (type) {
      case 'alert':
        this.smartModalDialog.open({
          message: {
            textL10nId: message
          },
          buttonSettings: [{
            textL10nId: evt.yesText || 'ok',
            defaultFocus: true,
            onClick: this.confirmHandler.bind(this)
          }],
          onCancel: this.cancelHandler.bind(this)
        });
        this.setTitle('alert', title);
        break;

      case 'prompt':
        this.smartInputDialog.open({
          message: {
            textL10nId: message
          },
          initialInputValue: evt.detail.initialValue,
          buttonSettings: [{
            textL10nId: evt.yesText || 'ok',
            defaultFocus: true,
            onClick: this.confirmHandler.bind(this)
          },
          {
            textL10nId: evt.noText || 'cancel',
            onClick: this.cancelHandler.bind(this)
          }],
          onCancel: this.cancelHandler.bind(this)
        });
        this.setTitle('prompt', title);
        break;

      case 'confirm':
        this.smartModalDialog.open({
          message: {
            textL10nId: message,
          },
          buttonSettings: [{
            textL10nId: evt.yesText || 'ok',
            defaultFocus: true,
            onClick: this.confirmHandler.bind(this)
          },
          {
            textL10nId: evt.noText || 'cancel',
            onClick: this.cancelHandler.bind(this)
          }],
          onCancel: this.cancelHandler.bind(this)
        });
        this.setTitle('confirm', title);
        break;

      case 'selectone':
        this.buildSelectOneDialog(message);
        elements.selectOne.classList.add('visible');
        break;
    }

    this.setHeight(window.innerHeight);
    focusManager.focus();
  },

  hide: function md_hide() {
    var evt = this.eventForCurrentOrigin;
    var type = evt.detail.promptType;
    this.currentOrigin = null;
    this.screen.classList.remove('modal-dialog');
    this.elements[type].classList.remove('visible');
    this.smartModalDialog.close();
    this.smartInputDialog.close();
  },

  setTitle: function md_setTitle(type, title) {
    // Title is now invisible by UX spec. We just leave it empty.
  },

  // When user clicks OK button on alert/confirm/prompt
  confirmHandler: function md_confirmHandler() {
    this.screen.classList.remove('modal-dialog');
    var evt = this.eventForCurrentOrigin;

    var type = evt.detail.promptType || evt.detail.type;
    switch (type) {

      case 'prompt':
        evt.detail.returnValue = this.smartInputDialog.textInput.value;
        this.smartInputDialog.textInput.value = '';
        break;

      case 'confirm':
        evt.detail.returnValue = true;
        break;
    }

    if (evt.isPseudo && evt.callback) {
      evt.callback(evt.detail.returnValue);
    }

    if (evt.detail.unblock) {
      evt.detail.unblock();
    }
    focusManager.focus();
    this.processNextEvent();
  },

  // When user clicks cancel button on confirm/prompt or
  // when the user try to escape the dialog with the escape key
  cancelHandler: function md_cancelHandler() {
    var evt = this.eventForCurrentOrigin;
    this.screen.classList.remove('modal-dialog');
    var elements = this.elements;

    var type = evt.detail.promptType || evt.detail.type;
    switch (type) {

      case 'prompt':
        /* return null when click cancel */
        evt.detail.returnValue = null;
        this.smartInputDialog.textInput.value = '';
        break;

      case 'confirm':
        /* return false when click cancel */
        evt.detail.returnValue = false;
        break;

      case 'selectone':
        /* return null when click cancel */
        evt.detail.returnValue = null;
        elements.selectOne.classList.remove('visible');
        break;
    }

    if (evt.isPseudo && evt.cancelCallback) {
      evt.cancelCallback(evt.detail.returnValue);
    }

    if (evt.detail.unblock) {
      evt.detail.unblock();
    }
    focusManager.focus();
    this.processNextEvent();
  },

  // When user selects an option on selectone dialog
  selectOneHandler: function md_confirmHandler(target) {
    this.screen.classList.remove('modal-dialog');
    var elements = this.elements;

    var evt = this.eventForCurrentOrigin;

    evt.detail.returnValue = target.id;
    elements.selectOne.classList.remove('visible');

    if (evt.isPseudo && evt.callback) {
      evt.callback(evt.detail.returnValue);
    }

    if (evt.detail.unblock) {
      evt.detail.unblock();
    }
    focusManager.focus();
    this.processNextEvent();
  },

  buildSelectOneDialog: function md_buildSelectOneDialog(data) {
    var elements = this.elements;
    elements.selectOneTitle.setAttribute('data-l10n-id', data.title);
    elements.selectOneMenu.innerHTML = '';

    if (!data.options) {
      return;
    }

    var itemsHTML = '';
    for (var i = 0; i < data.options.length; i++) {
      itemsHTML += Sanitizer.escapeHTML `<li>
        <button id="${data.options[i].id}">${data.options[i].text}</button>
      </li>`;
    }

    elements.selectOneMenu.innerHTML = itemsHTML;
  },

  /**
  * Method about customized alert
  * @param  {String} title the title of the dialog. null or empty for
  *                        no title.
  * @param  {String} text message for the dialog.
  * @param  {Object} confirm {title, callback} object when confirm.
  */
  alert: function md_alert(title, text, confirm) {
    this.showWithPseudoEvent({
      type: 'alert',
      text: text,
      callback: confirm.callback,
      title: title,
      yesText: confirm.title
    });
  },

  /**
  * Method about customized confirm
  * @param  {String} title the title of the dialog. null or empty for
  *                        no title.
  * @param  {String} text message for the dialog.
  * @param  {Object} confirm {title, callback} object when confirm.
  * @param  {Object} cancel {title, callback} object when cancel.
  */
  confirm: function md_confirm(title, text, confirm, cancel) {
    this.showWithPseudoEvent({
      type: 'confirm',
      text: text,
      callback: confirm.callback,
      cancel: cancel.callback,
      title: title,
      yesText: confirm.title,
      noText: cancel.title
    });
  },

  /**
  * Method about customized prompt
  * @param  {String} title the title of the dialog. null or empty for
  *                        no title.
  * @param  {String} text message for the dialog.
  * @param  {String} default_value message in the text field.
  * @param  {Object} confirm {title, callback} object when confirm.
  * @param  {Object} cancel {title, callback} object when cancel.
  */
  prompt: function md_prompt(title, text, default_value, confirm, cancel) {
    this.showWithPseudoEvent({
      type: 'prompt',
      text: text,
      initialValue: default_value,
      callback: confirm.callback,
      cancel: cancel.callback,
      title: title,
      yesText: confirm.title,
      noText: cancel.title
    });
  },

  selectOne: function md_selectOne(data, callback) {
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

    pseudoEvt.detail.title = config.title;
    pseudoEvt.detail.message = config.text;
    pseudoEvt.callback = config.callback;
    pseudoEvt.detail.promptType = config.type;
    pseudoEvt.cancelCallback = config.cancel;
    pseudoEvt.yesText = config.yesText;
    pseudoEvt.noText = config.noText;
    if (config.type == 'prompt') {
      pseudoEvt.detail.initialValue = config.initialValue;
    }

    // Create a virtual mapping in this.currentEvents,
    // since system-app uses the different way to call ModalDialog.
    if (!this.currentEvents.system) {
      this.currentEvents.system = [];
    }
    this.currentEvents.system.push(pseudoEvt);
    this.show(null, 'system');
  },

  isVisible: function md_isVisible() {
    return this.screen ? this.screen.classList.contains('modal-dialog') : false;
  },

  isFocusable: function md_isFocusable() {
    return this.isVisible();
  },

  getElement: function md_getElement() {
    if (this.isFocusable()) {
      return this.dialog;
    }
  },

  focus: function md_focus() {
    if (this.isFocusable()) {
      document.activeElement.blur();
      var type = this.eventForCurrentOrigin.detail.promptType;
      if (type === 'selectone') {
        document.getElementById(this.prefix + 'select-one')
              .querySelector('button').focus();
      } else {
        if (this.smartModalDialog.element.classList.contains(
                                                      'modal-dialog-opened')) {
          this.smartModalDialog.focus();
        }
        if (this.smartInputDialog.element.classList.contains(
                                                      'modal-dialog-opened')) {
          this.smartInputDialog.focus();
        }
      }
    }
  },
};

ModalDialog.init();
