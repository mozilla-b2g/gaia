/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global FxaModuleStates, FxaModuleUI, FxaModule, FxaModuleNavigation,
   FxModuleServerRequest, FxaModuleOverlay, FxaModuleManager */
/* exported FxaModuleEnterPassword */

'use strict';

/**
 * This module checks the validity of password given email address, and if
 * valid, determine which screen to go next.
 */

var FxaModuleEnterPassword = (function() {

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

  function _loadSigninSuccess(done) {
    done(FxaModuleStates.SIGNIN_SUCCESS);
  }

  function _notVerifiedUser(done) {
    done(FxaModuleStates.SIGNUP_SUCCESS);
  }

  function _togglePasswordVisibility() {
    /*jshint validthis:true*/
    var passwordFieldType = !!this.fxaShowPw.checked ? 'text' : 'password';
    this.fxaPwInput.setAttribute('type', passwordFieldType);
  }

  function _forgotPassword() {
    /*jshint validthis:true*/
    var self = this;
    if (this.isFTU) {
      return this.showErrorResponse({
        error: 'RESET_PASSWORD_ERROR'
      });
    }
    // Note: we don't need to pass a success callback, but we do need an errback
    FxModuleServerRequest.requestPasswordReset(
      this.email,
      this.isFTU,
      function on_reset_error() {
        self.showErrorResponse({
          error: 'UNKNOWN_ERROR'
        });
      }
    );
  }

  var Module = Object.create(FxaModule);
  Module.init = function init(options) {

    if (!this.initialized) {
      _ = navigator.mozL10n.get;
      // Cache DOM elements
      this.importElements(
        'fxa-hello-known-user',
        'fxa-pw-input',
        'fxa-show-pw',
        'fxa-forgot-password'
      );
      // Add listeners
      this.fxaPwInput.addEventListener(
        'input',
        function onInput(event) {
          _enableNext(event.target);
        }
      );
      // Ensure that pressing 'ENTER' (keycode 13) we send the form
      // as expected
      this.fxaPwInput.addEventListener(
        'keypress',
        function onKeypress(event) {
          if (_isPasswordValid(this.fxaPwInput) && event.keyCode === 13) {
            document.activeElement.blur();
            FxaModuleNavigation.next();
          }
        }.bind(this)
      );

      this.fxaShowPw.addEventListener(
        'change',
        _togglePasswordVisibility.bind(this),
        false
      );

      this.fxaForgotPassword.addEventListener(
        'click',
        _forgotPassword.bind(this),
        false
      );
      // Avoid repeated initialization
      this.initialized = true;
    }

    if (!options || !options.email) {
      console.error('Options are not sent properly. Email not available');
      return;
    }

    this.isFTU = !!(options && options.isftu);
    this.email = options.email;

    var helloUserText = _('fxa-hello-user');
    helloUserText = helloUserText.replace(
      /{{\s*email\s*}}/,
      '<a id="fxa-known-user-email">' + this.email + '</a>'
    );
    this.fxaHelloKnownUser.innerHTML = helloUserText;

    _cleanForm(
      this.fxaPwInput,
      this.fxaShowPw
    );

    _enableNext(this.fxaPwInput);

  };

  Module.onNext = function onNext(gotoNextStepCallback) {
    FxaModuleOverlay.show('fxa-connecting');

    FxaModuleManager.setParam('success', true);
    FxModuleServerRequest.signIn(
      this.email,
      this.fxaPwInput.value,
      function onServerResponse(response) {
        FxaModuleOverlay.hide();

        if (!response.authenticated) {
          _notVerifiedUser(gotoNextStepCallback);
          return;
        }

        _loadSigninSuccess(gotoNextStepCallback);
      }.bind(this),
      function onError(response) {
        _cleanForm(
          this.fxaPwInput,
          this.fxaShowPw
        );
        this.showErrorResponse(response);
      }.bind(this)
    );
  };

  return Module;

}());

