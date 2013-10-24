/**
 */
FirefoxAccountEnterPassword = (function() {
  'use strict';

  var EMAIL_SELECTOR = '#ff_account--enter_password--email';
  var PASSWORD_SELECTOR = '#ff_account--enter_password';
  var SHOW_PASSWORD_SELECTOR = '.pack-checkbox__enter_password--show_password';
  var SHOW_PASSWORD_CHECKBOX_SELECTOR =
          '#ff_account--enter_password--show_password';
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
    done('#ff-account-email-submit-screen');
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

    forward: function() {
      var passwordEl = $(PASSWORD_SELECTOR);

      if ( ! isPasswordValid(passwordEl)) {
        return showInvalidPassword();
      }

      var passwordValue = passwordEl.value;
      this.passwordValue = passwordValue;

      getNextState(passwordValue, function(nextState) {
        document.location.hash = nextState;
      });
    },

    getPassword: function() {
      return this.passwordValue;
    },

    togglePasswordVisibility: togglePasswordVisibility
  };

  return Module;

}());

