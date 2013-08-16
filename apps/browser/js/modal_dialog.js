/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// The modal dialog listen to mozbrowsershowmodalprompt event.
// Blocking the current app and then show custom modal dialog
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
      'custom-prompt', 'custom-prompt-message', 'custom-prompt-buttons',
      'custom-prompt-checkbox'];

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
  },

  // Save the events returned by mozbrowsershowmodalprompt for later use.
  // The events are stored according to webapp origin and in the order in
  // which they are received,
  // e.g., 'http://uitest.gaiamobile.org': [evt1, evt2]
  currentEvents: {},

  init: function md_init() {
    // Get all elements initially.
    this.getAllElements();
    var elements = this.elements;
    for (var id in elements) {
      if (elements[id].tagName.toLowerCase() == 'button') {
        elements[id].addEventListener('click', this);
      }
    }
    elements.customPromptButtons.addEventListener('click', this);
  },

  // Default event handler
  handleEvent: function md_handleEvent(evt, origin) {
    var elements = this.elements;
    switch (evt.type) {
      case 'mozbrowsershowmodalprompt':
        if (this.boundToWindow && evt.target.dataset.frameType != 'window')
          return;
        evt.preventDefault();
        if (this.originHasEvent(origin)) {
          this.currentEvents[origin].push(evt);
          break;
        }
        this.currentEvents[origin] = [evt];

        // Show modal dialog only if
        // the frame is currently displayed.
        this.show(origin);
        break;

      case 'click':
        if (evt.currentTarget.nodeName == 'BUTTON' ||
            evt.currentTarget == elements.customPromptButtons) {
          evt.preventDefault();
        }
        if (evt.currentTarget === elements.confirmCancel ||
            evt.currentTarget === elements.promptCancel) {
          this.cancelHandler();
        } else {
          this.confirmHandler(evt.target);
        }
        break;
    }
  },

  // Show relative dialog and set message/input value well
  show: function md_show(origin) {
    this.currentOrigin = origin;
    var evt = this.currentEvents[origin][0];

    var message = evt.detail.message;
    var elements = this.elements;
    document.body.classList.add('modal-active');

    function escapeHTML(str) {
      var span = document.createElement('span');
      span.textContent = str;
      // Escape space for displaying multiple space in message.
      span.innerHTML = span.innerHTML.replace(/\n/g, '<br/>');
      return span.innerHTML;
    }

    message = escapeHTML(message);

    var type = evt.detail.promptType;

    switch (type) {
      case 'alert':
        elements.alertMessage.innerHTML = message;
        elements.alert.classList.add('visible');
        elements.alert.focus();
        break;

      case 'prompt':
        elements.prompt.classList.add('visible');
        elements.promptInput.value = evt.detail.initialValue;
        elements.promptMessage.innerHTML = message;
        elements.prompt.focus();
        break;

      case 'custom-prompt':
        var prompt = evt.detail;
        elements.customPrompt.classList.add('visible');
        elements.customPromptMessage.innerHTML = prompt.message;

        // Display custom list of buttons
        elements.customPromptButtons.innerHTML = '';
        elements.customPromptButtons.setAttribute('data-items',
                                                  prompt.buttons.length);
        for (var i = 0, l = prompt.buttons.length; i < l; i++) {
          var button = prompt.buttons[i];
          var domElement = document.createElement('button');
          domElement.dataset.buttonIndex = i;
          if (button.messageType === 'builtin') {
            // List of potential `message` values are defined here:
            // http://hg.mozilla.org/mozilla-central/annotate/5ce71981e005/dom/browser-element/BrowserElementPromptService.jsm#l157
            domElement.textContent = navigator.mozL10n.get(button.message);
          } else if (button.messageType === 'custom') {
            // For custom button, we assume that the text is already translated
            domElement.textContent = button.message;
          } else {
            console.error('Unexpected button type : ' + button.messageType);
            return;
          }
          elements.customPromptButtons.appendChild(domElement);
        }

        // Eventualy display a checkbox:
        var checkbox = elements.customPromptCheckbox;
        checkbox.hidden = !prompt.showCheckbox;
        if (prompt.showCheckbox) {
          if (prompt.checkboxCheckedByDefault) {
            checkbox.setAttribute('checked', 'true');
          } else {
            checkbox.removeAttribute('checked');
          }
          // We assume that checkbox custom message is already translated
          checkbox.nextElementSibling.textContent = prompt.checkboxMessage;
        }

        elements.customPrompt.focus();
        break;

      case 'confirm':
        elements.confirm.classList.add('visible');
        elements.confirmMessage.innerHTML = message;
        elements.confirm.focus();
        break;
    }
  },

  hide: function md_hide() {
    document.body.classList.remove('modal-active');
    var evt = this.currentEvents[this.currentOrigin][0];
    if (!evt)
      return;
    var type = evt.detail.promptType;
    this.currentOrigin = null;
  },

  // When user clicks OK button on alert/confirm/prompt
  confirmHandler: function md_confirmHandler(target) {
    document.body.classList.remove('modal-active');
    var elements = this.elements;

    var evt = this.currentEvents[this.currentOrigin][0];
    var type = evt.detail.promptType;

    switch (type) {
      case 'alert':
        elements.alert.classList.remove('visible');
        break;

      case 'prompt':
        evt.detail.returnValue = elements.promptInput.value;
        elements.prompt.classList.remove('visible');
        break;

      case 'custom-prompt':
        var returnValue = {
          selectedButton: target.dataset.buttonIndex
        };
        if (evt.detail.showCheckbox)
          returnValue.checked = elements.customPromptCheckbox.checked;
        evt.detail.returnValue = returnValue;
        elements.customPrompt.classList.remove('visible');
        break;

      case 'confirm':
        evt.detail.returnValue = true;
        elements.confirm.classList.remove('visible');
        break;
    }

    if (evt.detail.unblock)
      evt.detail.unblock();

    this.remove(this.currentOrigin);
  },

  // When user clicks cancel button on confirm/prompt or
  // when the user try to escape the dialog with the escape key
  cancelHandler: function md_cancelHandler() {
    var evt = this.currentEvents[this.currentOrigin][0];
    var elements = this.elements;
    var type = evt.detail.promptType;

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
    }

    if (evt.detail.unblock)
      evt.detail.unblock();

    this.remove(this.currentOrigin);
  },

  originHasEvent: function(origin) {
    return origin in this.currentEvents;
  },

  clear: function ad_clear(origin) {
    if (this.currentEvents[origin])
      delete this.currentEvents[origin];
  },

  remove: function(origin) {
    if (this.currentEvents[origin]) {
      this.currentEvents[origin].shift();
      if (this.currentEvents[origin].length != 0) {
        this.show(origin);
        return;
      }
      delete this.currentEvents[origin];
    }
  }
};
