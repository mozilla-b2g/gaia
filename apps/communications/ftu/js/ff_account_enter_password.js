/**
 */
FirefoxAccountEnterPassword = (function() {
  'use strict';

  var states = FirefoxAccountsStates;

  var EMAIL_SELECTOR = '#ff_account--enter_password--email';
  var PASSWORD_SELECTOR = '#ff_account--enter_password';
  var SHOW_PASSWORD_SELECTOR = '.pack-checkbox__enter_password--show_password';
  var SHOW_PASSWORD_CHECKBOX_SELECTOR =
          '#ff_account--enter_password--show_password';
  var PASSWORD_INVALID_ERROR_SELECTOR =
          '#ff-account-password-invalid-error-dialog';
  var PASSWORD_MISMATCH_ERROR_SELECTOR =
          '#ff-account-password-mismatch-error-dialog';

  function $(selector) {
    return document.querySelector(selector);
  }

  // only checks whether the password passes input validation
  function isPasswordValid(passwordEl) {
    var passwordValue = passwordEl.value;
    return passwordValue && passwordEl.validity.valid;
  }

  function showPasswordInvalid() {
    return $(PASSWORD_INVALID_ERROR_SELECTOR).classList.add('visible');
  }

  function checkPasswordCorrect(email, password, done) {
    // TODO - hook up to client lib to authenticate a user.
    if (password === 'password') return done(true);
    done(false);
  }

  function showPasswordMismatch() {
    return $(PASSWORD_MISMATCH_ERROR_SELECTOR).classList.add('visible');
  }

  function togglePasswordVisibility() {
    var showPassword = !!$(SHOW_PASSWORD_CHECKBOX_SELECTOR).checked;
    var passwordFieldType = showPassword ? 'text' : 'password';

    $(PASSWORD_SELECTOR).setAttribute('type', passwordFieldType);
  }


  var Module = {
    init: function(options) {
      options = options || {};

      this.email = options.email;

      $(EMAIL_SELECTOR).innerHTML = options.email;

      // TODO - put the binding in ui.js
      $(SHOW_PASSWORD_SELECTOR).addEventListener(
          'click', togglePasswordVisibility, false);
    },

    forward: function(gotoNextStepCallback) {
      var passwordEl = $(PASSWORD_SELECTOR);

      if ( ! isPasswordValid(passwordEl)) {
        return showPasswordInvalid();
      }

      var passwordValue = passwordEl.value;
      checkPasswordCorrect(this.email, passwordValue, function(isPasswordCorrect) {
        if ( ! isPasswordCorrect) {
          return showPasswordMismatch();
        }

        this.passwordValue = passwordValue;
        gotoNextStepCallback(states.SIGNIN_SUCCESS);
      }.bind(this));
    },

    getPassword: function() {
      return this.passwordValue;
    },

    togglePasswordVisibility: togglePasswordVisibility
  };

  return Module;

}());

