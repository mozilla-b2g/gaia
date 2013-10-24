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
  var INVALID_PASSWORD_ERROR_SELECTOR = '#invalid-email-error-dialog';

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

  function getNextState(password, done) {
    done(states.SIGNUP_SUCCESS);
  }

  function togglePasswordVisibility() {
    var showPassword = !!$(SHOW_PASSWORD_CHECKBOX_SELECTOR).checked;
    var passwordFieldType = showPassword ? 'text' : 'password';

    $(PASSWORD_SELECTOR).setAttribute('type', passwordFieldType);
  }

  var Module = {
    init: function(options) {
      options = options || {};

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
      this.passwordValue = passwordValue;

      getNextState(passwordValue, gotoNextStepCallback);
    },

    getPassword: function() {
      return this.passwordValue;
    },

    togglePasswordVisibility: togglePasswordVisibility
  };

  return Module;

}());

