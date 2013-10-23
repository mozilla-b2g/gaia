/**
 * Module checks the validity of an email address, and if valid,
 * determine which screen to go to next.
 */
FirefoxAccountEnterEmail = (function() {
  'use strict';

  var FF_ACCOUNT_EMAIL_SELECTOR = '#ff_account--enter-email';
  var INVALID_EMAIL_ERROR_SELECTOR = '#invalid-email-error-dialog';

  function $(selector) {
    return document.querySelector(selector);
  }

  function isEmailValid(emailEl) {
    var emailValue = emailEl.value;
    return emailValue && emailEl.validity.valid;
  }

  function showInvalidEmail() {
    return $(INVALID_EMAIL_ERROR_SELECTOR).classList.add('visible');
  }

  function getNextState(email, done) {
    if (email === 'newuser@newuser.com') return done('#ff-account-create-password-screen');

    done('#ff-account-enter-password-screen');
  }

  var Module = {
    forward: function(gotoNextStepCallback) {
      var emailEl = $(FF_ACCOUNT_EMAIL_SELECTOR);

      if ( ! isEmailValid(emailEl)) return showInvalidEmail();

      var emailValue = emailEl.value;
      this.emailValue = emailValue;

      getNextState(emailValue, function(nextState) {
        document.location.hash = nextState;
      });
    },

    getEmail: function() {
      return this.emailValue;
    }
  };

  return Module;

}());

