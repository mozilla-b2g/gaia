/* global AppModalDialog, BaseUI */
'use strict';

(function(exports) {
  var _ = navigator.mozL10n.get;
  var _id = 0;

  /**
   * The ModalDialog of the AppWindow.
   *
   * Including **alert**, **prompt**, **confirm**, and
   * **single select** dialogs.
   *
   * @class AppModalDialog
   * @param {AppWindow} app The app window instance
   *                        where this dialog should popup.
   * @extends BaseUI
   */
  exports.AppModalDialog = function AppModalDialog(app) {
    this.app = app;
    this.containerElement = app.element;
    this.events = [];
    // One to one mapping.
    this.instanceID = _id++;
    this._injected = false;
    this._visible = false;
    app.element.addEventListener('mozbrowsershowmodalprompt', this);
    return this;
  };

  AppModalDialog.prototype = Object.create(BaseUI.prototype);

  AppModalDialog.prototype.CLASS_NAME = 'AppModalDialog';

  AppModalDialog.prototype.ELEMENT_PREFIX = 'modal-dialog-';

  AppModalDialog.prototype.customID = function amd_customID() {
    if (this.app) {
      return '[' + this.app.origin + ']';
    } else {
      return '';
    }
  };

  AppModalDialog.prototype.handleEvent = function amd_handleEvent(evt) {
    this.app.debug('handling ' + evt.type);
    evt.preventDefault();
    evt.stopPropagation();
    this.events.push(evt);
    this.menuHeight = 0;
    if (!this._injected) {
      this.render();
    }
    this.show();
    this._injected = true;
  };

  AppModalDialog.prototype.isVisible = function amd_isVisible() {
    return this._visible;
  };

  AppModalDialog.prototype._fetchElements = function amd__fetchElements() {
    this.element = document.getElementById(this.CLASS_NAME + this.instanceID);
    this.elements = {};

    var toCamelCase = function toCamelCase(str) {
      return str.replace(/\-(.)/g, function replacer(str, p1) {
        return p1.toUpperCase();
      });
    };

    this.elementClasses = ['alert', 'alert-ok', 'alert-message',
      'prompt', 'prompt-ok', 'prompt-cancel', 'prompt-input', 'prompt-message',
      'confirm', 'confirm-ok', 'confirm-cancel', 'confirm-message',
      'select-one', 'select-one-cancel', 'select-one-menu', 'select-one-title',
      'alert-title', 'confirm-title', 'prompt-title',
      'custom-prompt', 'custom-prompt-message', 'custom-prompt-buttons',
      'custom-prompt-checkbox'];


    // Loop and add element with camel style name to Modal Dialog attribute.
    this.elementClasses.forEach(function createElementRef(name) {
      this.elements[toCamelCase(name)] =
        this.element.querySelector('.' + this.ELEMENT_PREFIX + name);
    }, this);

    this.elements.menu = this.element.querySelector('menu');
  };

  AppModalDialog.prototype._registerEvents = function amd__registerEvents() {
    var elements = this.elements;
    for (var id in elements) {
      var tagName = elements[id].tagName.toLowerCase();
      if (tagName == 'button' || tagName == 'ul') {
        if (elements[id].classList.contains('confirm')) {
          elements[id].addEventListener('click',
            this.confirmHandler.bind(this));
        } else if (elements[id].classList.contains('cancel')) {
          elements[id].addEventListener('click', this.cancelHandler.bind(this));
        }
      }
    }
  };

  AppModalDialog.prototype.view = function amd_view() {
    var id = this.CLASS_NAME + this.instanceID;
    return `<div class="modal-dialog" id="${id}">
            <form class="modal-dialog-alert generic-dialog"
            role="dialog" tabindex="-1">
            <div class="modal-dialog-message-container inner">
              <h3 class="modal-dialog-alert-title"></h3>
              <p>
                <span class="modal-dialog-alert-message"></span>
              </p>
            </div>
            <menu>
              <button class="modal-dialog-alert-ok confirm affirmative"
              data-l10n-id="ok"></button>
            </menu>
          </form>
          <form class="modal-dialog-confirm generic-dialog"
          role="dialog" tabindex="-1">
            <div class="modal-dialog-message-container inner">
              <h3 class="modal-dialog-confirm-title"></h3>
              <p>
                <span class="modal-dialog-confirm-message"></span>
              </p>
            </div>
            <menu data-items="2">
              <button class="modal-dialog-confirm-cancel cancel"
              data-l10n-id="cancel"></button>
              <button class="modal-dialog-confirm-ok confirm affirmative"
              data-l10n-id="ok"></button>
            </menu>
          </form>
          <form class="modal-dialog-prompt generic-dialog"
            role="dialog" tabindex="-1">
            <div class="modal-dialog-message-container inner">
              <h3 class="modal-dialog-prompt-title"></h3>
              <p>
                <span class="modal-dialog-prompt-message"></span>
                <input class="modal-dialog-prompt-input" />
              </p>
            </div>
            <menu data-items="2">
              <button class="modal-dialog-prompt-cancel cancel"
               data-l10n-id="cancel"></button>
              <button class="modal-dialog-prompt-ok confirm affirmative"
              data-l10n-id="ok"></button>
            </menu>
          </form>
          <form class="modal-dialog-select-one generic-dialog"
            role="dialog" tabindex="-1">
            <div class="modal-dialog-message-container inner">
              <h3 class="modal-dialog-select-one-title"></h3>
              <ul class="modal-dialog-select-one-menu"></ul>
            </div>
            <menu>
              <button class="modal-dialog-select-one-cancel cancel"
              data-l10n-id="cancel"></button>
            </menu>
          </form>
          <form class="modal-dialog-custom-prompt generic-dialog"
            role="dialog" tabindex="-1">
            <div class="modal-dialog-message-container inner">
              <h3 class="modal-dialog-custom-prompt-title"></h3>
              <p class="modal-dialog-custom-prompt-message"></p>
              <label class="pack-checkbox">
                <input class="modal-dialog-custom-prompt-checkbox"
                type="checkbox"/>
                <span></span>
              </label>
            </div>
            <menu class="modal-dialog-custom-prompt-buttons"></menu>
          </form>
        </div>`;
  };

  AppModalDialog.prototype.processNextEvent = function amd_processNextEvent() {
    this.events.splice(0, 1);
    if (this.events.length) {
      this.show();
    } else {
      this.hide();
    }
  };

  AppModalDialog.prototype.kill = function amd_kill() {
    this._visible = false;
    this.containerElement.removeChild(this.element);
  };

  // Show relative dialog and set message/input value well
  AppModalDialog.prototype.show = function amd_show() {
    if (!this.events.length) {
      return;
    }

    this._visible = true;
    var evt = this.events[0];

    var message = evt.detail.message || '';
    var title = this._getTitle(evt.detail.title);
    var elements = this.elements;

    function escapeHTML(str) {
      var stringHTML = str;
      stringHTML = stringHTML.replace(/</g, '&#60;');
      stringHTML = stringHTML.replace(/(\r\n|\n|\r)/gm, '<br/>');
      stringHTML = stringHTML.replace(/\s\s/g, ' &nbsp;');

      return stringHTML.replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
    }

    var type = evt.detail.promptType || evt.detail.type;
    if (type !== 'selectone') {
      message = escapeHTML(message);
    }

    switch (type) {
      case 'alert':
        elements.alertTitle.innerHTML = title;
        elements.alertMessage.innerHTML = message;
        elements.alert.classList.add('visible');
        elements.alertOk.textContent = evt.yesText ? evt.yesText : _('ok');
        elements.alert.focus();

        this.updateMaxHeight();
        break;

      case 'prompt':
        elements.prompt.classList.add('visible');
        elements.promptInput.value = evt.detail.initialValue;
        elements.promptTitle.innerHTML = title;
        elements.promptMessage.innerHTML = message;
        elements.promptOk.textContent = evt.yesText ? evt.yesText : _('ok');
        elements.promptCancel.textContent = evt.noText ?
          evt.noText : _('cancel');
        elements.prompt.focus();
        break;

      case 'confirm':
        elements.confirm.classList.add('visible');
        elements.confirmTitle.innerHTML = title;
        elements.confirmMessage.innerHTML = message;
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

      case 'custom-prompt':
        var customPrompt = evt.detail;
        elements.customPrompt.classList.add('visible');
        elements.customPromptMessage.innerHTML = customPrompt.message;
        // Display custom list of buttons
        elements.customPromptButtons.innerHTML = '';
        elements.customPromptButtons.setAttribute('data-items',
                                                  customPrompt.buttons.length);
        var domElement = null;
        for (var i = customPrompt.buttons.length - 1; i >= 0; i--) {
          var button = customPrompt.buttons[i];
          domElement = document.createElement('button');
          domElement.dataset.buttonIndex = i;
          if (button.messageType === 'builtin') {
            domElement.setAttribute('data-l10n-id', button.message);
          } else if (button.messageType === 'custom') {
            // For custom button, we assume that the text is already translated
            domElement.textContent = button.message;
          } else {
            console.error('Unexpected button type : ' + button.messageType);
            continue;
          }
          domElement.addEventListener('click', this.confirmHandler.bind(this));
          elements.customPromptButtons.appendChild(domElement);
        }
        domElement.classList.add('affirmative');

        // Eventualy display a checkbox:
        var checkbox = elements.customPromptCheckbox;
        if (customPrompt.showCheckbox) {
          if (customPrompt.checkboxCheckedByDefault) {
            checkbox.setAttribute('checked', 'true');
          } else {
            checkbox.removeAttribute('checked');
          }
          // We assume that checkbox custom message is already translated
          checkbox.nextElementSibling.textContent =
            customPrompt.checkboxMessage;
        } else {
          checkbox.parentNode.classList.add('hidden');
        }

        elements.customPrompt.focus();
        break;
    }

    this.app.browser.element.setAttribute('aria-hidden', true);
    this.element.classList.add('visible');
  };

  AppModalDialog.prototype.hide = function amd_hide() {
    this._visible = false;
    this.element.blur();
    this.app.browser.element.removeAttribute('aria-hidden');
    this.element.classList.remove('visible');
    if (this.app) {
      this.app.focus();
    }
    if (!this.events.length) {
      return;
    }

    var evt = this.events[0];
    var type = evt.detail.promptType || evt.detail.type;
    if (type === 'prompt') {
      this.elements.promptInput.blur();
    }
    this.elements[type].classList.remove('visible');
  };

  // When user clicks OK button on alert/confirm/prompt
  AppModalDialog.prototype.confirmHandler =
    function amd_confirmHandler(clickEvt) {
      if (!this.events.length) {
        return;
      }

      clickEvt.preventDefault();

      var elements = this.elements;

      var evt = this.events[0];

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

        case 'custom-prompt':
          var returnValue = {
            selectedButton: clickEvt.target.dataset.buttonIndex
          };
          if (evt.detail.showCheckbox) {
            returnValue.checked = elements.customPromptCheckbox.checked;
          }
          evt.detail.returnValue = returnValue;
          elements.customPrompt.classList.remove('visible');
          break;
      }

      if (evt.detail.unblock) {
        evt.detail.unblock();
      }

      this.processNextEvent();
    };

  // When user clicks cancel button on confirm/prompt or
  // when the user try to escape the dialog with the escape key
  AppModalDialog.prototype.cancelHandler =
    function amd_cancelHandler(clickEvt) {
      if (!this.events.length) {
        return;
      }

      clickEvt.preventDefault();
      var evt = this.events[0];
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

      if (evt.detail.unblock) {
        evt.detail.unblock();
      }

      this.processNextEvent();
    };

  // When user selects an option on selectone dialog
  AppModalDialog.prototype.selectOneHandler =
    function amd_selectOneHandler(target) {
      if (!this.events.length) {
        return;
      }

      var elements = this.elements;

      var evt = this.events[0];

      evt.detail.returnValue = target.id;
      elements.selectOne.classList.remove('visible');

      if (evt.detail.unblock) {
        evt.detail.unblock();
      }

      this.processNextEvent();
    };

  AppModalDialog.prototype.updateMaxHeight = function() {
    // Setting maxHeight for being able to scroll long
    // texts: formHeight - menuHeight - titleHeight - margin
    // We should fix this in a common way for all the dialogs
    // in the building blocks layer: Bug 1096902
    this.menuHeight = this.menuHeight || this.elements.menu.offsetHeight;
    var messageHeight = this.element.offsetHeight - this.menuHeight;
    messageHeight -= this.elements.alertTitle.offsetHeight;
    var margin = window.getComputedStyle(this.elements.alertTitle).marginBottom;
    var messageContainer = this.elements.alert.querySelector('.inner p');
    var calc = 'calc(' + messageHeight + 'px - ' + margin + ')';
    messageContainer.style.maxHeight = calc;
  };

  AppModalDialog.prototype._getTitle =
    function amd__getTitle(title) {
      //
      // XXX Bug 982006, subsystems like uriloader still report errors with
      // titles which are important to the user for context in diagnosing
      // issues.
      //
      // However, we will ignore all titles containing a URL using the app
      // protocol. These types of titles simply indicate that the active
      // application is prompting and are more confusing to the user than
      // useful. Instead we will return the application name if there is one
      // or an empty string.
      //
      if (!title ||
          title.contains('app://')) {
        return this.app.name || '';
      }

      return title;
    };
}(window));
