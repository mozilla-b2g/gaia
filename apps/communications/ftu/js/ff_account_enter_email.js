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

  function getNextState(email, done) {
    if (email === 'newuser@newuser.com') return done('#ff-account-create-password-screen');

    done('#ff-account-enter-password-screen');
  }

  var Module = {
    init: function em_init() {
    },

    forward: function(gotoNextStepCallback) {
      var emailEl = $(FF_ACCOUNT_EMAIL_SELECTOR);

      if ( ! isEmailValid(emailEl)) {
        return $(INVALID_EMAIL_ERROR_SELECTOR).classList.add('visible');
      }

      var emailValue = emailEl.value;
      this.emailValue = emailValue;

      getNextState(emailValue, function(nextState) {
        document.location.hash = nextState;
      });
    }
  };

  return Module;

}());

