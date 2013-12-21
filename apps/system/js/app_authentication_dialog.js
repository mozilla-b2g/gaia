'use strict';

(function(window) {
  var _id = 0;

  /**
   * The https authentication dialog of the AppWindow.
   *
   * @class AppAuthenticationDialog
   * @param {AppWindow} app The app window instance
   *                        where this dialog should popup.
   * @extends BaseUI
   */
  window.AppAuthenticationDialog = function AppAuthenticationDialog(app) {
    this.app = app;
    this._event = null;
    this.containerElement = app.element;
    this.instanceID = _id++;
    this._injected = false;
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

  // Store the authentication event.
  // Note: Only one event one time.
  AppAuthenticationDialog.prototype._event = null;

  // Get all elements when inited.
  AppAuthenticationDialog.prototype._fetchElements =
    function aad__fetchElements() {
    this.element = document.getElementById(this.CLASS_NAME + this.instanceID);
    this.elements = {};

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

  AppAuthenticationDialog.prototype.view = function aad_view() {
    return '<div class="authentication-dialog" ' +
            'id="' + this.CLASS_NAME + this.instanceID + '">' +
            '<div role="dialog" ' +
            'class="authentication-dialog-http-authentication ' +
            'generic-dialog" >' +
            '<div class="authentication-dialog-message-container inner">' +
              '<h3 class="authentication-dialog-title"></h3>' +
              '<p>' +
                '<span ' +
                'class="authentication-dialog-http-authentication-message">' +
                '</span>' +
              '</p>' +
              '<p>' +
                '<span data-l10n-id="username">Username</span>' +
                '<input class="authentication-dialog-http-username-input" ' +
                'type="text" />' +
                '<span data-l10n-id="password">Password</span>' +
                '<input class="authentication-dialog-http-password-input" ' +
                'type="password" />' +
              '</p>' +
            '</div>' +
            '<menu data-items="2">' +
              '<button ' +
              'class="authentication-dialog-http-authentication-cancel" ' +
              'data-l10n-id="cancel">Cancel</button>' +
              '<button class="authentication-dialog-http-authentication-ok ' +
              'affirmative" data-l10n-id="login">Login</button>' +
            '</menu>' +
          '</div>' +
        '</div>';
  };

  AppAuthenticationDialog.prototype.handleEvent = function(evt) {
    System.debug(' AAD>> got event: ' + evt.type);
    evt.preventDefault();
    this._event = evt;
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
    var evt = this._event;
    var elements = this.elements;
    this.element.classList.add('visible');
    elements.httpAuthentication.classList.add('visible');
    System.debug(' AAD>> showing');
    elements.title.textContent = evt.detail.host;
    elements.httpAuthenticationMessage.textContent = evt.detail.realm;
    elements.httpUsernameInput.value = '';
    elements.httpPasswordInput.value = '';
  };

  AppAuthenticationDialog.prototype.hide = function aad_hide() {
    this.elements.httpUsernameInput.blur();
    this.elements.httpPasswordInput.blur();
    this.elements.httpAuthentication.classList.remove('visible');
    this.element.classList.remove('visible');
    System.debug(' AAD>> hided');
  };

  AppAuthenticationDialog.prototype.confirmHandler =
    function aad_confirmHandler() {
      var elements = this.elements;
      var evt = this._event;
      this.hide();
      evt.detail.authenticate(elements.httpUsernameInput.value,
        elements.httpPasswordInput.value);
      this._event = null;
    };

  AppAuthenticationDialog.prototype.cancelHandler =
    function aad_cancelHandler() {
      var evt = this._event;
      var elements = this.elements;
      this.hide();
      evt.detail.cancel();
      this._event = null;
    };
}(this));
