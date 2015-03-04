/* global AppModalDialog, AirplaneMode, SimpleKeyNavigation, KeyEvent */
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

    this.simpleKeyNavigation = new SimpleKeyNavigation();

    app.element.addEventListener('mozbrowsershowmodalprompt', this);
    return this;
  };

  AppModalDialog.prototype = Object.create(exports.BaseUI.prototype);

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
    if (!this._injected) {
      this.render();
    }
    this.show();
    this._injected = true;
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
  };

  AppModalDialog.prototype._registerEvents = function amd__registerEvents() {
    var elements = this.elements;
    for (var id in elements) {
      var tagName = elements[id].tagName.toLowerCase();
      if (tagName == 'smart-button' || tagName == 'ul') {
        if (elements[id].classList.contains('confirm')) {
          elements[id].addEventListener('click',
            this.confirmHandler.bind(this));
        } else if (elements[id].classList.contains('cancel')) {
          elements[id].addEventListener('click', this.cancelHandler.bind(this));
        }
      }
    }

    // For prompt dialog
    this.elements.promptInput.addEventListener('keyup', function(evt) {
      if (evt.keyCode === KeyEvent.DOM_VK_RETURN) {
        this.confirmHandler(evt);
      }
    }.bind(this));
    // XXX: Since we are trying to keep enter key actioning on keyup; submit
    // event should be prevented since it works on keydown. We can remove this
    // workaround after changing containers from <form> to other DOM elements.
    this.element.addEventListener('submit', function(evt){
      evt.explicitOriginalTarget.focus();
      evt.preventDefault();
    }.bind(this));
  };

  AppModalDialog.prototype.getTitle = function amd_getTitle() {
    if (AirplaneMode && AirplaneMode.enabled) {
      return _('airplane-is-on');
    } else if (!navigator.onLine) {
      return _('network-connection-unavailable');
    } else {
      return _('error-title', { name: this.app.name });
    }
  };

  AppModalDialog.prototype.getMessage = function amd_getMessage() {
    if (AirplaneMode && AirplaneMode.enabled) {
      return _('airplane-is-turned-on', { name: this.app.name });
    } else if (!navigator.onLine) {
      return _('network-error', { name: this.app.name });
    } else {
      return _('error-message', { name: this.app.name });
    }
  };

  AppModalDialog.prototype.view = function amd_view() {
    return '<div class="modal-dialog"' +
            ' id="' + this.CLASS_NAME + this.instanceID + '">' +
            '<form class="modal-dialog-alert generic-dialog" ' +
            'role="dialog" tabindex="-1">' +
            '<div class="modal-dialog-message-container inner">' +
              '<h3 class="modal-dialog-alert-title"></h3>' +
              '<p>' +
                '<span class="modal-dialog-alert-message"></span>' +
              '</p>' +
            '</div>' +
            '<menu>' +
              '<smart-button type="circle-text" ' +
                'class="modal-dialog-alert-ok confirm affirmative" ' +
                'data-l10n-id="ok">OK</smart-button>' +
            '</menu>' +
          '</form>' +
          '<form class="modal-dialog-confirm generic-dialog" ' +
          'role="dialog" tabindex="-1">' +
            '<div class="modal-dialog-message-container inner">' +
              '<h3 class="modal-dialog-confirm-title"></h3>' +
              '<p>' +
                '<span class="modal-dialog-confirm-message"></span>' +
              '</p>' +
            '</div>' +
            '<menu data-items="2">' +
              '<smart-button type="circle-text"' +
                'class="modal-dialog-confirm-cancel cancel"' +
                'data-l10n-id="cancel">Cancel</smart-button>' +
              '<smart-button type="circle-text"' +
                'class="modal-dialog-confirm-ok confirm affirmative"' +
                'data-l10n-id="ok">OK</smart-button>' +
            '</menu>' +
          '</form>' +
          '<form class="modal-dialog-prompt generic-dialog" ' +
            'role="dialog" tabindex="-1">' +
            '<div class="modal-dialog-message-container inner">' +
              '<h3 class="modal-dialog-prompt-title"></h3>' +
              '<p>' +
                '<span class="modal-dialog-prompt-message"></span>' +
                '<input class="modal-dialog-prompt-input" />' +
              '</p>' +
            '</div>' +
            '<menu data-items="2">' +
              '<smart-button type="circle-text" ' +
                'class="modal-dialog-prompt-cancel cancel"' +
                'data-l10n-id="cancel">Cancel</smart-button>' +
              '<smart-button type="circle-text" ' +
                'class="modal-dialog-prompt-ok confirm affirmative" ' +
                'data-l10n-id="ok">OK</smart-button>' +
            '</menu>' +
          '</form>' +
          '<form class="modal-dialog-select-one generic-dialog" ' +
            'role="dialog" ' +
            'tabindex="-1">' +
            '<div class="modal-dialog-message-container inner">' +
              '<h3 class="modal-dialog-select-one-title"></h3>' +
              '<ul class="modal-dialog-select-one-menu"></ul>' +
            '</div>' +
            '<menu>' +
              '<smart-button type="circle-text" ' +
              'class="modal-dialog-select-one-cancel cancel" ' +
              'data-l10n-id="cancel">Cancel</smart-button>' +
            '</menu>' +
          '</form>' +
          '<form class="modal-dialog-custom-prompt generic-dialog" ' +
            'role="dialog" ' +
            'tabindex="-1">' +
            '<div class="modal-dialog-message-container inner">' +
              '<h3 class="modal-dialog-custom-prompt-title"></h3>' +
              '<p class="modal-dialog-custom-prompt-message"></p>' +
              '<label class="pack-checkbox">' +
                '<input class="modal-dialog-custom-prompt-checkbox" ' +
                'type="checkbox"/>' +
                '<span></span>' +
              '</label>' +
            '</div>' +
            '<menu class="modal-dialog-custom-prompt-buttons"></menu>' +
          '</form>' +
        '</div>';
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
    this.containerElement.removeChild(this.element);
  };

  // Show relative dialog and set message/input value well
  AppModalDialog.prototype.show = function amd_show() {
    if (!this.events.length) {
      return;
    }

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

    // TODO: Currently we only implmented key navigation for prompt dialog.
    // Other dialogs also need to be implemented.
    switch (type) {
      case 'alert':
        elements.alertTitle.innerHTML = title;
        elements.alertMessage.innerHTML = message;
        elements.alert.classList.add('visible');
        if (evt.yesText) {
          elements.alertOk.removeAttribute('data-l10n-id');
          elements.alertOk.textContent = evt.yesText;
        } else {
          elements.alertOk.setAttribute('data-l10n-id', 'ok');
        }

        this.simpleKeyNavigation.start(
          [elements.alertOk],
          SimpleKeyNavigation.DIRECTION.HORIZONTAL,
          {target: elements.alert});

        // XXX: Focusing smart-button fails at the second time popup if we don't
        // postpone it. We need to find the root cause.
        setTimeout(function() {
          document.activeElement.blur();
          this.simpleKeyNavigation.focus();
        }.bind(this), 100);
        break;

      case 'prompt':
        elements.prompt.classList.add('visible');
        elements.promptInput.value = evt.detail.initialValue;
        elements.promptTitle.innerHTML = title;
        elements.promptMessage.innerHTML = message;

        if (evt.yesText) {
          elements.promptOk.removeAttribute('data-l10n-id');
          elements.promptOk.textContent = evt.yesText;
        } else {
          elements.promptOk.setAttribute('data-l10n-id', 'ok');
        }

        if (evt.noText) {
          elements.promptCancel.removeAttribute('data-l10n-id');
          elements.promptCancel.textContent = evt.noText;
        } else {
          elements.promptCancel.setAttribute('data-l10n-id', 'cancel');
        }

        document.activeElement.blur();
        var horizontalButtonNavigation = new SimpleKeyNavigation();
        horizontalButtonNavigation.start(
          [elements.promptCancel, elements.promptOk],
          SimpleKeyNavigation.DIRECTION.HORIZONTAL,
          {isChild: true});
        this.simpleKeyNavigation.start(
          [elements.promptInput, horizontalButtonNavigation],
          SimpleKeyNavigation.DIRECTION.VERTICAL,
          {target: elements.prompt});
        elements.promptInput.select();
        break;

      case 'confirm':
        elements.confirm.classList.add('visible');
        elements.confirmTitle.innerHTML = title;
        elements.confirmMessage.innerHTML = message;

        if (evt.yesText) {
          elements.confirmOk.removeAttribute('data-l10n-id');
          elements.promptOk.textContent = evt.yesText;
        } else {
          elements.confirmOk.setAttribute('data-l10n-id', 'ok');
        }

        if (evt.noText) {
          elements.confirmCancel.removeAttribute('data-l10n-id');
          elements.confirmCancel.textContent = evt.noText;
        } else {
          elements.confirmCancel.setAttribute('data-l10n-id', 'cancel');
        }

        document.activeElement.blur();
        this.simpleKeyNavigation.start(
          [elements.confirmCancel, elements.confirmOk],
          SimpleKeyNavigation.DIRECTION.HORIZONTAL,
          {target: elements.confirm});

        // XXX: Focusing smart-button fails at the second time popup if we don't
        // postpone it. We need to find the root cause.
        setTimeout(function() {
          document.activeElement.blur();
          this.simpleKeyNavigation.focus();
        }.bind(this), 100);
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
    this.simpleKeyNavigation.blur();
    this.simpleKeyNavigation.stop();
    this.app.browser.element.removeAttribute('aria-hidden');
    this.element.classList.remove('visible');
    if (this.app) {
      this.app.focus();
    }
    if (!this.events.length) {
      return;
    }

    var evt = this.events[0];
    var type = evt.detail.promptType;
    this.elements[type].classList.remove('visible');
  };

  AppModalDialog.prototype.isVisible = function amd_isVisible() {
    return !!this.element && this.element.classList.contains('visible');
  };

  AppModalDialog.prototype.focus = function amd_show() {
    document.activeElement.blur();
    this.simpleKeyNavigation && this.simpleKeyNavigation.focus();
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
