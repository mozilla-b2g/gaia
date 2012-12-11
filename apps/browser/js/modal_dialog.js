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
  // The events are stored according to webapp origin
  // e.g., 'http://uitest.gaiamobile.org': evt
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
        this.currentEvents[origin] = evt;

        // Show modal dialog only if
        // the frame is currently displayed.
        this.show(origin);
        break;

      case 'click':
        if (evt.currentTarget.nodeName == "BUTTON" ||
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
    var evt = this.currentEvents[origin];

    var message = evt.detail.message;
    var elements = this.elements;

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
        elements.alert.hidden = false;
        break;

      case 'prompt':
        elements.prompt.hidden = false;
        elements.promptInput.value = evt.detail.initialValue;
        elements.promptMessage.innerHTML = message;
        break;

      case 'custom-prompt':
        var prompt = evt.detail;
        elements.customPrompt.hidden = false;
        elements.customPromptMessage.innerHTML = prompt.message;

        // Display custom list of buttons
        elements.customPromptButtons.innerHTML = '';
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
        break;

      case 'confirm':
        elements.confirm.hidden = false;
        elements.confirmMessage.innerHTML = message;
        break;
    }
  },

  hide: function md_hide() {
    var evt = this.currentEvents[this.currentOrigin];
    if (!evt)
      return;
    var type = evt.detail.promptType;
    this.currentOrigin = null;
  },

  // When user clicks OK button on alert/confirm/prompt
  confirmHandler: function md_confirmHandler(target) {
    var elements = this.elements;

    var evt = this.currentEvents[this.currentOrigin];
    var type = evt.detail.promptType;

    switch (type) {
      case 'alert':
        elements.alert.hidden = true;
        break;

      case 'prompt':
        evt.detail.returnValue = elements.promptInput.value;
        elements.prompt.hidden = true;
        break;

      case 'custom-prompt':
        var returnValue = {
          selectedButton: target.dataset.buttonIndex
        };
        if (evt.showCheckbox)
          returnValue.checked = elements.customPromptCheckbox.checked;
        evt.detail.returnValue = returnValue;
        elements.customPrompt.hidden = true;
        break;

      case 'confirm':
        evt.detail.returnValue = true;
        elements.confirm.hidden = true;
        break;
    }

    if (evt.detail.unblock)
      evt.detail.unblock();

    delete this.currentEvents[this.currentOrigin];
  },

  // When user clicks cancel button on confirm/prompt or
  // when the user try to escape the dialog with the escape key
  cancelHandler: function md_cancelHandler() {
    var evt = this.currentEvents[this.currentOrigin];
    var elements = this.elements;
    var type = evt.detail.promptType;

    switch (type) {
      case 'alert':
        elements.alert.hidden = true;
        break;

      case 'prompt':
        /* return null when click cancel */
        evt.detail.returnValue = null;
        elements.prompt.hidden = true;
        break;

      case 'confirm':
        /* return false when click cancel */
        evt.detail.returnValue = false;
        elements.confirm.hidden = true;
        break;
    }

    if (evt.detail.unblock)
      evt.detail.unblock();

    delete this.currentEvents[this.currentOrigin];
  },

  originHasEvent: function(origin) {
    return origin in this.currentEvents;
  }
};
