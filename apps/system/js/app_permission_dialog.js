/* global AppPermissionDialog, LazyLoader, AppWindowManager,
   applications, ManifestHelper, Template */
'use strict';

(function(window) {
  var _ = navigator.mozL10n.get;
  var _id = 0;

  /**
   * Handle Web API permissions such as geolocation, getUserMedia
   * @class AppPermissionDialog
   * @param {AppWindow} app The app window instance
   *                        where this dialog should popup.
   * @extends BaseUI
   */
  window.AppPermissionDialog = function AppPermissionDialog(app) {
    this.app = app;
    this.containerElement = app.element;
    this.events = [];
    // One to one mapping.
    this.instanceID = _id++;
    this._injected = false;
    // this.app.element.addEventListener('mozChromeEvent', this);
    window.addEventListener('mozChromeEvent', this);
  };

  AppPermissionDialog.prototype.__proto__ = window.BaseUI.prototype;

  AppPermissionDialog.prototype.CLASS_NAME = 'AppPermissionDialog';

  AppPermissionDialog.prototype.ELEMENT_PREFIX = 'permission-dialog-';

  AppPermissionDialog.prototype.customID = function amd_customID() {
    if (this.app) {
      return '[' + this.app.origin + ']';
    } else {
      return '';
    }
  };

  AppPermissionDialog.prototype.handleEvent = function amd_handleEvent(evt) {
    console.log('Erorr XXXX >>>permission dialog');
    this.app.debug('handling ' + evt.type);
    evt.preventDefault();
    this.events.push(evt);
    if (!this._injected) {
      this.render();
    }
    this.show();
    this._injected = true;
  };

  AppPermissionDialog.prototype._fetchElements = function amd__fetchElements() {
    this.element = document.getElementById(this.CLASS_NAME + this.instanceID);
    this.elements = {};

    var toCamelCase = function toCamelCase(str) {
      return str.replace(/\-(.)/g, function replacer(str, p1) {
        return p1.toUpperCase();
      });
    };

    this.elementClasses = ['permission-dialog',
      'permission-message', 'permission-more-info', 'permission-more-info-link',
      'permission-hide-info-link', 'permission-more-info-box',
      'permission-yes', 'permission-no', 'permission-remember-checkbox',
      'permission-remember-section', 'permission-devices'];


    // Loop and add element with camel style name to Modal Dialog attribute.
    this.elementClasses.forEach(function createElementRef(name) {
      this.elements[toCamelCase(name)] =
        this.element.querySelector('.' + this.ELEMENT_PREFIX + name);
    }, this);
  };

  AppPermissionDialog.prototype._registerEvents =
    function amd__registerEvents() {
    var elements = this.elements;
    for (var id in elements) {
      var tagName = elements[id].tagName.toLowerCase();
      if (tagName == 'button' || tagName == 'ul') {
        // if (elements[id].classList.contains('confirm')) {
        //   elements[id].addEventListener('click',
        //     this.confirmHandler.bind(this));
        // } else if (elements[id].classList.contains('cancel')) {
        //   elements[id].addEventListener('click',
        //     this.cancelHandler.bind(this));
        // }
      }
    }
  };

  AppPermissionDialog.prototype.view = function amd_view() {
    console.log('Error >>>view');
    return '<div data-z-index-level="permission-screen' +
      ' id="' + this.CLASS_NAME + this.instanceID + '">' +
      '<div id="permission-dialog" role="dialog" class="generic-dialog">' +
        '<div class="inner">' +
          '<h2 id="permission-message"></h2>' +
          '<div id="permission-more-info" class="hidden">' +
            '<a id="permission-more-info-link" data-l10n-id="more-info"' +
            ' href="#">More Info…</a>' +
            '<a id="permission-hide-info-link" data-l10n-id="hide-info"' +
            ' href="#" class="hidden">Hide Info</a>' +
            '<div id="permission-more-info-box" class="hidden"> </div>' +
          '</div>' +
          '<div id="permission-remember-section">' +
            '<a data-l10n-id="remember-my-choice" ' +
            'id="permission-remember-label">Remember my choice</a>' +
            '<label class="pack-switch">' +
              '<input type="checkbox" id="permission-remember-checkbox" />' +
              '<span></span>' +
            '</label>' +
          '</div>' +
          '<ul id="permission-devices">' +
          '</ul>' +
          '<menu data-items="2">' +
            '<button id="permission-no"></button>' +
            '<button id="permission-yes" class="affirmative"></button>' +
          '</menu>' +
        '</div>' +
      '</div>' +
    '</div>;';
  };

  AppPermissionDialog.prototype.processNextEvent =
    function amd_processNextEvent() {
    this.events.splice(0, 1);
    if (this.events.length) {
      this.show();
    } else {
      this.hide();
    }
  };

  AppPermissionDialog.prototype.kill = function amd_kill() {
    this.containerElement.removeChild(this.element);
  };

  // Show relative dialog and set message/input value well
  AppPermissionDialog.prototype.show = function amd_show() {
    if (!this.events.length) {
      return;
    }

    var evt = this.events[0];

    this.app.browser.element.setAttribute('aria-hidden', true);
    this.element.classList.add('visible');
  };

  AppPermissionDialog.prototype.hide = function amd_hide() {
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
    var type = evt.detail.promptType;
    if (type === 'prompt') {
      this.elements.promptInput.blur();
    }
    this.elements[type].classList.remove('visible');
  };

  // When user clicks OK button on alert/confirm/prompt
  AppPermissionDialog.prototype.confirmHandler =
    function amd_confirmHandler(clickEvt) {
      if (!this.events.length) {
        return;
      }

      clickEvt.preventDefault();

      var elements = this.elements;

      var evt = this.events[0];
      this.processNextEvent();
  };

  // When user clicks cancel button on confirm/prompt or
  // when the user try to escape the dialog with the escape key
  AppPermissionDialog.prototype.cancelHandler =
    function amd_cancelHandler(clickEvt) {
      if (!this.events.length) {
        return;
      }

      clickEvt.preventDefault();
      var evt = this.events[0];
      var elements = this.elements;
  };
}(this));
