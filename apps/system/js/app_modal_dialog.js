'use strict';

(function(window) {
  var _ = navigator.mozL10n.get;

  window.AppModalDialog = function AppModalDialog(app) {
    this.app = app;
    var element = this.app.element;
    // One to one mapping.
    this.instanceID = this.app.instanceID || this.app.element.id;
    element.addEventListener('mozbrowsershowmodalprompt', function(evt) {
      evt.preventDefault();
      if (!this.events) {
        this.events = [];
      }
      this.events.push(evt);
      if (!this._injected) {
        this.render();
      }
      this.update();
      this.show();
      this._injected = true;
    }.bind(this));
    return this;
  };

  AppModalDialog.className = 'AppModalDialog';

  AppModalDialog.prototype.prefix = 'modal-dialog-';

  AppModalDialog.prototype.render = function amd_render() {
    this.app.frame.insertAdjacentHTML('beforeend', this.view());
    this.element = document.getElementById(this.className + this.instanceID);
    this.elements = {};
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
        this.element.querySelector('.' + this.prefix + name);
    }, this);
    this._registerEvents();
  };

  AppModalDialog.prototype._registerEvents = function amd__registerEvents() {

  };

  AppModalDialog.prototype.update = function amd_update() {
  };

  AppModalDialog.prototype.getTitle = function amd_getTitle() {
    if (AirplaneMode.enabled) {
      return _('airplane-is-on');
    } else if (!navigator.onLine) {
      return _('network-connection-unavailable');
    } else {
      return _('error-title', { name: this.app.name });
    }
  };

  AppModalDialog.prototype.getMessage = function amd_getMessage() {
    if (AirplaneMode.enabled) {
      return _('airplane-is-turned-on', { name: this.app.name });
    } else if (!navigator.onLine) {
      return _('network-error', { name: this.app.name });
    } else {
      return _('error-message', { name: this.app.name });
    }
  };

  AppModalDialog.prototype.view = function amd_view() {
    return '<div class="modal-dialog"' +
            ' id="' + this.className + this.instanceID + '">' +
            '<div class="modal-dialog-alert" role="dialog"' +
            ' class="generic-dialog" tabindex="-1">' +
            '<div class="modal-dialog-message-container inner">' +
              '<h3 class="modal-dialog-alert-title"></h3>' +
              '<p>' +
                '<span class="modal-dialog-alert-message"></span>' +
              '</p>' +
            '</div>' +
            '<menu>' +
              '<button class="modal-dialog-alert-ok" ' +
              'data-l10n-id="ok" class="affirmative">OK</button>' +
            '</menu>' +
          '</div>' +
          '<div class="modal-dialog-confirm" ' +
          'role="dialog" class="generic-dialog" tabindex="-1">' +
            '<div class="modal-dialog-message-container inner">' +
              '<h3 class="modal-dialog-confirm-title"></h3>' +
              '<p>' +
                '<span class="modal-dialog-confirm-message"></span>' +
              '</p>' +
            '</div>' +
            '<menu data-items="2">' +
              '<button class="modal-dialog-confirm-cancel" ' +
              'data-l10n-id="cancel">Cancel</button>' +
              '<button class="modal-dialog-confirm-ok" data-l10n-id="ok" ' +
              'class="affirmative">OK</button>' +
            '</menu>' +
          '</div>' +
          '<div class="modal-dialog-prompt" role="dialog" ' +
            'class="generic-dialog" tabindex="-1">' +
            '<div class="modal-dialog-message-container inner">' +
              '<h3 class="modal-dialog-prompt-title"></h3>' +
              '<p>' +
                '<span class="modal-dialog-prompt-message"></span>' +
                '<input class="modal-dialog-prompt-input" />' +
              '</p>' +
            '</div>' +
            '<menu data-items="2">' +
              '<button class="modal-dialog-prompt-cancel"' +
              ' data-l10n-id="cancel">Cancel</button>' +
              '<button class="modal-dialog-prompt-ok" data-l10n-id="ok" ' +
              'class="affirmative">OK</button>' +
            '</menu>' +
          '</div>' +
          '<div class="modal-dialog-select-one" role="dialog" ' +
            'class="generic-dialog" tabindex="-1">' +
            '<div class="modal-dialog-message-container inner">' +
              '<h3 class="modal-dialog-select-one-title"></h3>' +
              '<ul class="modal-dialog-select-one-menu"></ul>' +
            '</div>' +
            '<menu>' +
              '<button class="modal-dialog-select-one-cancel" ' +
              'data-l10n-id="cancel">Cancel</button>' +
            '</menu>' +
          '</div>' +
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

  // Show relative dialog and set message/input value well
  AppModalDialog.prototype.show = function md_show() {
    if (!this.events || !this.events[0])
      return;

    var evt = this.events[0];
    var _ = navigator.mozL10n.get;

    var message = evt.detail.message || '';
    // XXX: Bug 916658 - Remove unused l10n resources from b2g gecko
    // If we have removed translations from Gecko, then we can remove this.
    var title = '';
    var elements = this.elements;

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

    this.element.classList.add('visible');
  };

  AppModalDialog.prototype.hide = function md_hide() {
    if (!this.events || !this.events[0])
      return;

    var evt = this.event[0];
    var type = evt.detail.promptType;
    if (type == 'prompt') {
      this.elements.promptInput.blur();
    }
    this.elements[type].classList.remove('visible');
    this.element.classList.remove('visible');
  };

  AppModalDialog.prototype.setTitle = function md_setTitle(type, title) {
    this.elements[type + 'Title'].textContent = title;
  };

  // When user clicks OK button on alert/confirm/prompt
  AppModalDialog.prototype.confirmHandler = function md_confirmHandler() {
    if (!this.events || !this.events[0])
      return;

    var elements = this.elements;

    var evt = this.event[0];

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
  };

  // When user clicks cancel button on confirm/prompt or
  // when the user try to escape the dialog with the escape key
  AppModalDialog.prototype.cancelHandler = function md_cancelHandler() {
    if (!this.events || !this.events[0])
      return;
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

    if (evt.isPseudo && evt.cancelCallback) {
      evt.cancelCallback(evt.detail.returnValue);
    }

    if (evt.detail.unblock)
      evt.detail.unblock();

    this.processNextEvent();
  };

  // When user selects an option on selectone dialog
  AppModalDialog.prototype.selectOneHandler =
    function md_confirmHandler(target) {
      this.screen.classList.remove('modal-dialog');
      var elements = this.elements;

      var evt = this.event[0];

      evt.detail.returnValue = target.id;
      elements.selectOne.classList.remove('visible');

      if (evt.isPseudo && evt.callback) {
        evt.callback(evt.detail.returnValue);
      }

      if (evt.detail.unblock)
        evt.detail.unblock();

      this.processNextEvent();
    };
}(this));
