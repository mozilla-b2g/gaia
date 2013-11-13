'use strict';

(function(window) {
  var _id = 0;
  window.AppAuthenticationDialog = function AppAuthenticationDialog(app) {
    this.app = app;
    this.events = [];
    this.elements = {};
    this.containerElement = app.element;
    this.instanceID = _id++;
    this.app.element.addEventListener('mozbrowserusernameandpasswordrequired',
      this);
  };

  AppAuthenticationDialog.prototype.__proto__ = window.BaseUI.prototype;

  AppAuthenticationDialog.prototype.CLASS_NAME = 'AuthenticationDialog';

  AppAuthenticationDialog.prototype.EVENT_PREFIX = 'authdialog';

  // Used for element id access.
  // e.g., 'authentication-dialog-alert-ok'
  AppAuthenticationDialog.prototype.ELEMENT_PREFIX = 'authentication-dialog-';

  // DOM
  AppAuthenticationDialog.prototype.elements = null;

  AppAuthenticationDialog.prototype.events = null;

  // Get all elements when inited.
  AppAuthenticationDialog.prototype.getAllElements =
    function aad_getAllElements() {
      var toCamelCase = function toCamelCase(str) {
        return str.replace(/\-(.)/g, function replacer(str, p1) {
          return p1.toUpperCase();
        });
      };

      this.elementClasses = [
        'http-authentication', 'http-username-input', 'http-password-input',
        'http-authentication-message', 'http-authentication-ok',
        'http-authentication-cancel', 'title'
      ];

      this.elementClasses.forEach(function createElementRef(name) {
        this.elements[toCamelCase(name)] =
          this.element.querySelector('.' + this.ELEMENT_PREFIX + name);
      }, this);
    };

  AppAuthenticationDialog.prototype.handleEvent = function(evt) {
    evt.preventDefault();
    this.events.push(evt);
    if (!this._injected) {
      this.render();
    }
    this.show();
    this._injected = true;
  };

  AppAuthenticationDialog.prototype._registerEvents =
    function aad__registerEvents() {
      this.elements['httpAuthenticationOk'].
        addEventListener('click', this.confirmHandler.bind(this));
      this.elements['httpAuthenticationCancel'].
        addEventListener('click', this.cancelHandler.bind(this));
    };

  AppAuthenticationDialog.prototype._unregisterEvents =
    function aad__unregisterEvents() {
      this.app.element.removeEventListener(
        'mozbrowserusernameandpasswordrequired',
        this);
    };

  AppAuthenticationDialog.prototype.show = function aad_show() {
    var evt = this.events[0];
    var elements = this.elements;
    elements.httpAuthentication.classList.add('visible');
    elements.title.textContent = evt.detail.host;
    elements.httpAuthenticationMessage.textContent = evt.detail.realm;
    elements.httpUsernameInput.value = '';
    elements.httpPasswordInput.value = '';
  };

  AppAuthenticationDialog.prototype.hide = function aad_hide() {
    this.elements.httpUsernameInput.blur();
    this.elements.httpPasswordInput.blur();
    this.elements.httpAuthentication.classList.remove('visible');
  };

  AppAuthenticationDialog.prototype.confirmHandler =
    function aad_confirmHandler() {
      var elements = this.elements;
      var evt = this.currentEvents[this.currentOrigin];
      evt.detail.authenticate(elements.httpUsernameInput.value,
        elements.httpPasswordInput.value);
      elements.httpAuthentication.classList.remove('visible');
      this.events.splice(0, 1);
    };

  AppAuthenticationDialog.prototype.cancelHandler =
    function aad_cancelHandler() {
      var evt = this.events[0];
      var elements = this.elements;
      evt.detail.cancel();
      elements.httpAuthentication.classList.remove('visible');
      this.events.splice(0, 1);
    };
}(this));
