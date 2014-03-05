/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * Takes care of a new user's set password screen. If password is valid,
 * attempt to stage the user.
 */
var FxaModuleSetPassword = (function() {

  var _ = null;

  function _isPasswordValid(passwordEl) {
    var passwordValue = passwordEl.value;
    return passwordValue && passwordEl.validity.valid;
  }

  function _enableNext(passwordEl) {
    if (_isPasswordValid(passwordEl)) {
      FxaModuleUI.enableNextButton();
    } else {
      FxaModuleUI.disableNextButton();
    }
  }

  function _cleanForm(passwordEl, passwordCheck) {
    passwordEl.value = '';
    passwordCheck.checked = false;
    passwordEl.setAttribute('type', 'password');
  }

  function _showRegistering() {
    FxaModuleOverlay.show(_('fxa-registering'));
  }

  function _hideRegistering() {
    FxaModuleOverlay.hide();
  }

  function _showUserNotCreated() {
    this.showErrorResponse({
      error: 'CANNOT_CREATE_ACCOUNT'
    });
  }

  function _togglePasswordVisibility() {
    var passwordFieldType = !!this.fxaShowPwSet.checked ? 'text' : 'password';
    this.fxaPwSetInput.setAttribute('type', passwordFieldType);
  }

  var Module = Object.create(FxaModule);
  Module.init = function init(options) {

    if (!this.initialized) {
      // l10n manager
      _ = navigator.mozL10n.get;
      // Cache DOM elements
      this.importElements(
        'fxa-user-set-email',
        'fxa-pw-set-input',
        'fxa-show-pw-set'
      );
      // Add Listeners
      this.fxaPwSetInput.addEventListener(
        'input',
        function onInput(event) {
          _enableNext(event.target);
        }
      );

      this.fxaShowPwSet.addEventListener(
        'change',
        _togglePasswordVisibility.bind(this),
        false
      );
    }

    options = options || {};

    this.email = options.email;
    this.fxaUserSetEmail.textContent = options.email;

    _cleanForm(
      this.fxaPwSetInput,
      this.fxaShowPwSet
    );

    _enableNext(this.fxaPwSetInput);
  };

  Module.onNext = function onNext(gotoNextStepCallback) {
    _showRegistering();
    FxModuleServerRequest.signUp(
      this.email,
      this.fxaPwSetInput.value,
      function(response) {
        _hideRegistering();

        var isAccountCreated = response.accountCreated;

        if (!isAccountCreated) {
          _showUserNotCreated.call(this);
          return;
        }

        gotoNextStepCallback(FxaModuleStates.SIGNUP_SUCCESS);
      }.bind(this),
      this.showErrorResponse
    );
  };

  return Module;

}());

