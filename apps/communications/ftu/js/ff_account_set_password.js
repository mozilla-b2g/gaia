/**
 * Takes care of a new user's set password screen. If password is valid,
 * attempt to stage the user.
 */
FirefoxAccountSetPassword = (function() {
  'use strict';

  var states = FirefoxAccountsStates;

  var EMAIL_SELECTOR = '#ff_account--set_password--email';
  var PASSWORD_SELECTOR = '#ff_account--set_password';
  var SHOW_PASSWORD_SELECTOR = '.pack-checkbox__set_password--show_password';
  var SHOW_PASSWORD_CHECKBOX_SELECTOR =
          '#ff_account--set_password--show_password';
  var INVALID_PASSWORD_ERROR_SELECTOR =
          '#ff-account-password-invalid-error-dialog';
  var PASSWORD_NOT_SET_ERROR_SELECTOR =
          '#ff-account-password-not-set-error-dialog';

  function $(selector) {
    return document.querySelector(selector);
  }

  function isPasswordValid(passwordEl) {
    var passwordValue = passwordEl.value;
    return passwordValue && passwordEl.validity.valid;
  }

  function showInvalidPassword() {
    return $(INVALID_PASSWORD_ERROR_SELECTOR).classList.add('visible');
  }

  function setPassword(email, password, done) {
    // TODO - hook up to client lib to stage a user.
    if (password === 'password') return done(true);
    done(false);
  }

  function showPasswordNotSet() {
    return $(PASSWORD_NOT_SET_ERROR_SELECTOR).classList.add('visible');
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
        return showInvalidPassword();
      }

      var passwordValue = passwordEl.value;
      setPassword(this.email, passwordValue, function(isPasswordSet) {
        if ( ! isPasswordSet) {
          return showPasswordNotSet();
        }

        this.passwordValue = passwordValue;
        gotoNextStepCallback(states.SIGNUP_SUCCESS);
      }.bind(this));
    },

    getPassword: function() {
      return this.passwordValue;
    },

    togglePasswordVisibility: togglePasswordVisibility
  };

  return Module;

}());

