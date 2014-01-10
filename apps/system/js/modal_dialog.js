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
      'select-one', 'select-one-cancel', 'select-one-menu', 'select-one-title',
      'alert-title', 'confirm-title', 'prompt-title'];

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
      case 'mozbrowsershowmodalprompt':
        var frameType = evt.target.dataset.frameType;
        if (frameType != 'window' && frameType != 'inline-activity')
          return;

        evt.preventDefault();
        var origin = evt.target.dataset.frameOrigin;
        if (!this.currentEvents[origin]) {
          this.currentEvents[origin] = [];
        }
        this.currentEvents[origin].push(evt);

        // Show modal dialog only if
        // the frame is currently displayed.
        if (origin == WindowManager.getDisplayedApp() ||
            frameType == 'inline-activity')
          this.show(evt.target, origin);
        break;

      case 'click':
        if (evt.currentTarget === elements.confirmCancel ||
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
        this.show(evt.target, evt.detail.origin);
        break;

      case 'home':
      case 'holdhome':
        // Inline activity, which origin is different from foreground app
        // or the homescreen app is displayed
        if (this.isVisible() &&
            (this.currentOrigin != WindowManager.getDisplayedApp() ||
             this.currentOrigin == HomescreenLauncher.origin))
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
        var keyboardHeight = KeyboardManager.getHeight();
        this.setHeight(window.innerHeight - keyboardHeight - StatusBar.height);
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
    if (this.isVisible())
      this.overlay.style.height = height + 'px';
  },

  // Show relative dialog and set message/input value well
  show: function md_show(target, origin) {
    if (!(origin in this.currentEvents))
      return;

    var _ = navigator.mozL10n.get;
    this.currentOrigin = origin;
    var evt = this.eventForCurrentOrigin;

    var message = evt.detail.message || '';
    var title = evt.detail.title || '';
    var elements = this.elements;
    this.screen.classList.add('modal-dialog');

    function escapeHTML(str) {
      var stringHTML = str;
      stringHTML = stringHTML.replace(/\</g, '&#60;');
      stringHTML = stringHTML.replace(/(\r\n|\n|\r)/gm, '<br/>');
      stringHTML = stringHTML.replace(/\s\s/g, ' &nbsp;');

      return stringHTML.replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
    }

    var type = evt.detail.promptType || evt.detail.type;
    if (type !== 'selectone') {
      message = escapeHTML(message);
    }

    // XXX: Bug 916658 - Remove unused l10n resources from b2g gecko
    // If we have removed translations from Gecko, then we can remove this.
    if (target && target.dataset.frameType === 'window') {
      title = '';
    }

    switch (type) {
      case 'alert':
        elements.alertMessage.innerHTML = message;
        elements.alert.classList.add('visible');
        this.setTitle('alert', title);
        elements.alertOk.textContent = evt.yesText ? evt.yesText : _('ok');
        elements.alert.focus();
        break;

      case 'prompt':
        elements.prompt.classList.add('visible');
        elements.promptInput.value = evt.detail.initialValue;
        elements.promptMessage.innerHTML = message;
        this.setTitle('prompt', '');
        elements.promptOk.textContent = evt.yesText ? evt.yesText : _('ok');
        elements.promptCancel.textContent = evt.noText ?
          evt.noText : _('cancel');
        elements.prompt.focus();
        break;

      case 'confirm':
        elements.confirm.classList.add('visible');
        elements.confirmMessage.innerHTML = message;
        this.setTitle('confirm', '');
        elements.confirmOk.textContent = evt.yesText ? evt.yesText : _('ok');
        elements.confirmCancel.textContent = evt.noText ?
          evt.noText : _('cancel');
        elements.confirm.focus();
        break;

      case 'selectone':
        this.buildSelectOneDialog(message);
        elements.selectOne.classList.add('visible');
        elements.selectOne.focus();
        break;
    }

    this.setHeight(window.innerHeight - StatusBar.height);
  },

  hide: function md_hide() {
    var evt = this.eventForCurrentOrigin;
    var type = evt.detail.promptType;
    if (type == 'prompt') {
      this.elements.promptInput.blur();
    }
    this.currentOrigin = null;
    this.screen.classList.remove('modal-dialog');
    this.elements[type].classList.remove('visible');
  },

  setTitle: function md_setTitle(type, title) {
    this.elements[type + 'Title'].textContent = title;
  },

  // When user clicks OK button on alert/confirm/prompt
  confirmHandler: function md_confirmHandler() {
    this.screen.classList.remove('modal-dialog');
    var elements = this.elements;

    var evt = this.eventForCurrentOrigin;

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
    }

    if (evt.isPseudo && evt.callback) {
      evt.callback(evt.detail.returnValue);
    }

    if (evt.detail.unblock)
      evt.detail.unblock();

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
    }

    if (evt.isPseudo && evt.cancelCallback) {
      evt.cancelCallback(evt.detail.returnValue);
    }

    if (evt.detail.unblock)
      evt.detail.unblock();

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

    if (evt.detail.unblock)
      evt.detail.unblock();

    this.processNextEvent();
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
    if (!this.currentEvents['system']) {
      this.currentEvents['system'] = [];
    }
    this.currentEvents['system'].push(pseudoEvt);
    this.show(null, 'system');
  },

  isVisible: function md_isVisible() {
    return this.screen.classList.contains('modal-dialog');
  }
};

ModalDialog.init();

