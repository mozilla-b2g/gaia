/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global FxaModuleStates, FxaModuleUI, FxaModule, FxModuleServerRequest,
   FxaModuleOverlay */
/* exported FxaModuleRefreshAuth */

'use strict';

var FxaModuleRefreshAuth = (function() {

  var _ = null;

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
        done(response.success);
      },
      this.showErrorResponse
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
    FxaModuleOverlay.show(_('fxa-requesting-password-reset'));
    _requestPasswordReset.call(
      this,
      this.accountId,
      function(isRequestHandled) {
        FxaModuleOverlay.hide();
        if (!isRequestHandled) {
          _showCouldNotResetPassword.call(this);
          return;
        }

        FxaModuleStates.setState(FxaModuleStates.PASSWORD_RESET_SUCCESS);
      }
    );
  }


  var Module = Object.create(FxaModule);
  Module.init = function init(options) {
    if (!this.initialized) {
      _ = navigator.mozL10n.get;
      // Cache DOM elements.
      this.importElements(
        'fxa-pw-input-refresh',
        'fxa-show-pw-refresh',
        'fxa-forgot-password-refresh',
        'fxa-user-email-refresh'
      );

      this.fxaPwInputRefresh.addEventListener('input', (function(event) {
        _enableDone(event.target);
      }).bind(this));

      this.fxaShowPwRefresh.addEventListener('change', (function() {
        var passwordFieldType = !!this.fxaShowPwRefresh.checked ? 'text' :
                                                                  'password';
        this.fxaPwInputRefresh.setAttribute('type', passwordFieldType);
      }).bind(this), false);

      this.fxaForgotPasswordRefresh.addEventListener('click',
                                                     _forgotPassword.bind(this),
                                                     false);
      this.initialized = true;
    }

    if (!options || !options.accountId) {
      console.error('Options are not sent properly. Email not available');
      return;
    }

    this.fxaUserEmailRefresh.textContent = options.accountId;
    this.accountId = options.accountId;

    _cleanForm(this.fxaPwInputRefresh, this.fxaShowPwRefresh);
    _enableDone(this.fxaPwInputRefresh);
  };

  Module.onDone = function onDone(callback) {
    FxaModuleOverlay.show(_('fxa-authenticating'));

    FxModuleServerRequest.signIn(
      this.accountId,
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
