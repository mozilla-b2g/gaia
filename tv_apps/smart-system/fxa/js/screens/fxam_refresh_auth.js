/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global FxaModule */
/* global FxaModuleKeyNavigation */
/* global FxaModuleNavigation */
/* global FxaModuleOverlay */
/* global FxaModuleStates */
/* global FxaModuleUI */
/* global FxModuleServerRequest */
/* global KeyEvent */
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

  function _togglePasswordVisibility() {
    /*jshint validthis:true*/
    var passwordFieldType =
                        !!this.fxaShowPwRefresh.checked ? 'text' : 'password';
    this.fxaPwInputRefresh.setAttribute('type', passwordFieldType);
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
        'fxa-forgot-password-refresh',
        'fxa-pw-clean-btn'
      );

      this.fxaPwInputRefresh.addEventListener('input', (function(event) {
        if(this.fxaPwInput.value) {
          this.fxaPwCleanBtn.classList.add('show');
        } else {
          this.fxaPwCleanBtn.classList.remove('show');
        }
        _enableDone(event.target);
      }).bind(this));

      this.fxaPwCleanBtn.addEventListener(
        'click',
        function onCleanButtonClick(e) {
          if(e.button === 0 ||
            (e.keyCode && e.keyCode === KeyEvent.DOM_VK_RETURN)) {
            this.fxaPwInput.value = '';
            FxaModuleKeyNavigation.focus(this.fxaPwInput);
            this.fxaPwCleanBtn.classList.remove('show');
          }
        }.bind(this)
      );

      this.fxaShowPwRefresh.addEventListener('change', (function() {
        var passwordFieldType = !!this.fxaShowPwRefresh.checked ? 'text' :
                                                                  'password';
      }).bind(this), false);

      // Ensure that pressing 'ENTER' (keycode 13) we send the form
      // as expected
      this.fxaPwInputRefresh.addEventListener('keypress', event => {
        if (_isPasswordValid(this.fxaPwInputRefresh) && event.keyCode === 13) {
          document.activeElement.blur();
          FxaModuleNavigation.done();
        }
      });

      this.fxaPwInputRefresh.addEventListener('focus', () => {
        setTimeout(this.fxaPwInputRefresh.select.bind(this.fxaPwInputRefresh));
      });

      this.fxaShowPwRefresh.addEventListener('keypress', e => {
        if (e.keyCode && e.keyCode === KeyEvent.DOM_VK_RETURN) {
          this.fxaShowPwRefresh.checked = !this.fxaShowPwRefresh.checked;
          _togglePasswordVisibility.bind(this)();
        }
      });

      this.fxaShowPwRefresh.addEventListener(
        'change',
        _togglePasswordVisibility.bind(this),
        false
      );

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

    // There are 3 reasons why using setTimeout at this place:
    // 1. Focus() only works in the setTimeout callback here
    // 2. The input will be focused first and the keyboard will be brought
    //    up. We need to do this after the slide up animation of the parent
    //    fxa_dialog. But the fxa iframe has no way to know when the slide up
    //    animation is finished.
    // 3. Put the FxaModuleKeyNavigation.add in the onanimate callback in
    //    fxam_navigation.js doesn't work, since there is no animation for the
    //    first page in the flow.
    setTimeout(() => {
      FxaModuleKeyNavigation.add([
        '#fxa-pw-input-refresh', '#fxa-show-pw-refresh',
        '#fxa-forgot-password-refresh', '#fxa-module-done',
        '#fxa-pw-clean-btn']);
    }, 500);
  };

  Module.onDone = function onDone(callback) {
    FxaModuleOverlay.show('fxa-connecting');

    FxModuleServerRequest.signIn(
      this.email,
      this.fxaPwInputRefresh.value,
      function onServerResponse(response) {
        FxaModuleOverlay.hide();
        FxaModuleKeyNavigation.remove([
          '#fxa-pw-input-refresh', '#fxa-show-pw-refresh',
          '#fxa-forgot-password-refresh', '#fxa-module-done',
          '#fxa-pw-clean-btn']);
        callback();
      }, function onError(response) {
        FxaModuleKeyNavigation.disable();
        _cleanForm(this.fxaPwInputRefresh,
                   this.fxaShowPwRefresh);
        this.showErrorResponse(response);
      }.bind(this)
    );
  };

  return Module;
})();
