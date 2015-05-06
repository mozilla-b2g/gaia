'use strict';

(function(exports) {
  var _id = 0;

  /**
   * The https authentication dialog of the AppWindow.
   *
   * @class AppAuthenticationDialog
   * @param {AppWindow} app The app window instance
   *                        where this dialog should popup.
   * @extends BaseUI
   */
  function AppAuthenticationDialog(app) {
    this.app = app;
    this._event = null;
    this.containerElement = app.element;
    this.instanceID = _id++;
    this._injected = false;
    this.app.element.addEventListener('mozbrowserusernameandpasswordrequired',
      this);
  }

  AppAuthenticationDialog.prototype = Object.create(window.BaseUI.prototype);

  AppAuthenticationDialog.prototype.CLASS_NAME = 'AuthenticationDialog';

  AppAuthenticationDialog.prototype.EVENT_PREFIX = 'authdialog';

  /**
   * Used for element id access.
   * e.g., 'authentication-dialog-alert-ok'
   * @type {String}
   * @memberof AppAuthenticationDialog.prototype
   */
  AppAuthenticationDialog.prototype.ELEMENT_PREFIX = 'authentication-dialog-';

  /**
   * Maps to DOM elements.
   * @type {Object}
   * @memberof AppAuthenticationDialog.prototype
   */
  AppAuthenticationDialog.prototype.elements = null;

  /**
   * The current authentication event.
   * Note: Only one event one time.
   * @type {Event}
   * @memberof AppAuthenticationDialog.prototype
   */
  AppAuthenticationDialog.prototype._event = null;

  /**
   * Get all elements when inited.
   * @memberof AppAuthenticationDialog.prototype
   */
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
      'http-username-input', 'http-password-input',
      'http-authentication-message', 'http-authentication-ok',
      'http-authentication-cancel', 'http-authentication-header'
    ];

    this.elementClasses.forEach(function createElementRef(name) {
      this.elements[toCamelCase(name)] =
        this.element.querySelector('.' + this.ELEMENT_PREFIX + name);
    }, this);
  };

  /**
   * Generates markup for the dialog.
   * @memberof AppAuthenticationDialog.prototype
   */
  AppAuthenticationDialog.prototype.view = function aad_view() {
    var id = this.CLASS_NAME + this.instanceID;

    return `<section class="authentication-dialog skin-organic" id="${id}"
      role="region">
      <gaia-header action="close"
        class="authentication-dialog-http-authentication-header">
        <button class="authentication-dialog-http-authentication-cancel">
        </button>
        <h1 data-l10n-id="sign-in-to-website"></h1>
        <button class="authentication-dialog-http-authentication-ok"
        data-l10n-id="login"></button>
      </gaia-header>
      <span class="authentication-dialog-http-authentication-message">
      </span>
      <label>
        <span data-l10n-id="username"></span>
        <input type="text" class="authentication-dialog-http-username-input" />
      </label>
      <label>
        <span data-l10n-id="password"></span>
        <input type="password"
               class="authentication-dialog-http-password-input" />
      </label>
    </section>`;
  };

  /**
   * General event handler interface.
   * @memberof AppAuthenticationDialog.prototype
   */
  AppAuthenticationDialog.prototype.handleEvent = function(evt) {
    this.debug(' AAD>> got event: ' + evt.type);
    evt.preventDefault();
    evt.stopPropagation();
    this._event = evt;
    if (!this._injected) {
      this.render();
    }
    this.show();
    this._injected = true;
  };

  /**
   * Registers click events.
   * @memberof AppAuthenticationDialog.prototype
   */
  AppAuthenticationDialog.prototype._registerEvents =
    function aad__registerEvents() {
      this.elements.httpAuthenticationOk.
        addEventListener('click', this.confirmHandler.bind(this));
      this.elements.httpAuthenticationHeader.
        addEventListener('action', this.cancelHandler.bind(this));
    };

  /**
   * Unregisters authentication events from the app element.
   * @memberof AppAuthenticationDialog.prototype
   */
  AppAuthenticationDialog.prototype._unregisterEvents =
    function aad__unregisterEvents() {
      this.app.element.removeEventListener(
        'mozbrowserusernameandpasswordrequired',
        this);
    };

  /**
   * Shows the authentication dialog.
   * @memberof AppAuthenticationDialog.prototype
   */
  AppAuthenticationDialog.prototype.show = function aad_show() {
    var evt = this._event;
    var elements = this.elements;
    this.element.classList.add('visible');
    this.debug(' AAD>> showing');
    navigator.mozL10n.setAttributes(
      elements.httpAuthenticationMessage,
      'http-authentication-message2',
      {host: evt.detail.host}
    );
    elements.httpUsernameInput.value = '';
    elements.httpPasswordInput.value = '';
  };

  /**
   * Hides the authentication dialog.
   * @memberof AppAuthenticationDialog.prototype
   */
  AppAuthenticationDialog.prototype.hide = function aad_hide() {
    this.elements.httpUsernameInput.blur();
    this.elements.httpPasswordInput.blur();
    this.element.classList.remove('visible');
    this.debug(' AAD>> hided');
  };

  /**
   * Called when the user confirms the authentication dialog.
   * @memberof AppAuthenticationDialog.prototype
   */
  AppAuthenticationDialog.prototype.confirmHandler =
    function aad_confirmHandler() {
      var elements = this.elements;
      var evt = this._event;
      this.hide();
      evt.detail.authenticate(elements.httpUsernameInput.value,
        elements.httpPasswordInput.value);
      this._event = null;
    };

  /**
   * Called when the user cancels the authentication dialog.
   * @memberof AppAuthenticationDialog.prototype
   */
  AppAuthenticationDialog.prototype.cancelHandler =
    function aad_cancelHandler() {
      var evt = this._event;
      this.hide();
      evt.detail.cancel();
      this._event = null;
    };

  exports.AppAuthenticationDialog = AppAuthenticationDialog;

}(window));
