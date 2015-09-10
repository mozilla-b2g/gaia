/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global FxaModuleStates, FxaModuleUI, FxaModule, FxModuleServerRequest,
   FxaModuleOverlay */
/* exported FxaModuleRefreshAuth */
/* jshint unused:false */

'use strict';

var FxaModuleRefreshAuth = (function() {

  function _isPasswordValid(passwordEl) {
    var passwordValue = passwordEl.value;
    return passwordValue && passwordEl.validity.valid;
  }

  function _enableDone(passwordEl) {
    if (_isPasswordValid(passwordEl)) {
      FxaModuleUI.enableDoneButton();
    } else {
      FxaModuleUI.disableDoneButton();
    }
  }

  function _cleanForm(passwordEl, passwordCheck) {
    passwordEl.value = '';
    passwordCheck.checked = false;
    passwordEl.setAttribute('type', 'password');
    FxaModuleUI.disableDoneButton();
  }

  function _requestPasswordReset(email, done) {
    /*jshint validthis:true */
    FxModuleServerRequest.requestPasswordReset(
      email,
      function onSuccess(response) {
        done();
      },
      function onError(response) {
        this._showCouldNotResetPassword();
      }.bind(this)
    );
  }

  function _showCouldNotResetPassword() {
    /*jshint validthis:true */
    this.showErrorResponse({
      error: 'RESET_PASSWORD_ERROR'
    });
  }

  function _forgotPassword() {
    /*jshint validthis:true */
    FxaModuleOverlay.show('fxa-requesting-password-reset');
    _requestPasswordReset.call(
      this,
      this.email,
      function() {
        FxaModuleOverlay.hide();
        FxaModuleStates.setState(FxaModuleStates.PASSWORD_RESET_SUCCESS);
      }
    );
  }


  var Module = Object.create(FxaModule);
  Module.init = function init(options) {
    if (!this.initialized) {
      // Cache DOM elements.
      this.importElements(
        'fxa-pw-input-refresh',
        'fxa-show-pw-refresh',
        'fxa-forgot-password-refresh'
      );

      this.fxaPwInputRefresh.addEventListener('input', (function(event) {
        _enableDone(event.target);
      }).bind(this));

      this.fxaShowPwRefresh.addEventListener('change', (function() {
        var passwordFieldType = !!this.fxaShowPwRefresh.checked ? 'text' :
                                                                  'password';
      }).bind(this), false);

      this.fxaForgotPasswordRefresh.addEventListener('click',
                                                     _forgotPassword.bind(this),
                                                     false);
      this.initialized = true;
    }

    if (!options || !options.email) {
      console.error('Options are not sent properly. Email not available');
      return;
    }

    this.email = options.email;

    _cleanForm(this.fxaPwInputRefresh, this.fxaShowPwRefresh);
    _enableDone(this.fxaPwInputRefresh);
  };

  Module.onDone = function onDone(callback) {
    FxaModuleOverlay.show('fxa-connecting');

    FxModuleServerRequest.signIn(
      this.email,
      this.fxaPwInputRefresh.value,
      function onServerResponse(response) {
        FxaModuleOverlay.hide();
        callback();
      }, function onError(response) {
        _cleanForm(this.fxaPwInputRefresh,
                   this.fxaShowPwRefresh);
        this.showErrorResponse(response);
      }.bind(this)
    );
  };

  return Module;
})();
