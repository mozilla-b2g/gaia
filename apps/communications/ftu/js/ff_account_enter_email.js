/**
 * Module checks the validity of an email address, and if valid,
 * determine which screen to go to next.
 */
FirefoxAccountEnterEmail = (function() {
  'use strict';

  var states = FirefoxAccountsStates;
  var FF_ACCOUNT_EMAIL_SELECTOR = '#ff_account--enter-email';
  var INVALID_EMAIL_ERROR_SELECTOR = '#invalid-email-error-dialog';

  function $(selector) {
    return document.querySelector(selector);
  }

  function isEmailValid(emailEl) {
    // user can skip ff account creation with no error
    // if they either enter no email
    return ! emailEl.value || emailEl.validity.valid;
  }

  function showInvalidEmail() {
    return $(INVALID_EMAIL_ERROR_SELECTOR).classList.add('visible');
  }

  function getNextState(email, done) {
    // TODO - this should be "DONE" or something to indicate completion of the
    // FF signup flow.
    if ( ! email) return done(states.DONE);
    if (email === 'newuser@newuser.com') return done(states.SET_PASSWORD);

    done(states.ENTER_PASSWORD);
  }

  var Module = {
    init: function() {
      // nothing to do here.
    },
    forward: function(gotoNextStepCallback) {
      var emailEl = $(FF_ACCOUNT_EMAIL_SELECTOR);

      if ( ! isEmailValid(emailEl)) return showInvalidEmail();

      var emailValue = emailEl.value;
      this.emailValue = emailValue;

      getNextState(emailValue, gotoNextStepCallback);
    },

    getEmail: function() {
      return this.emailValue;
    }
  };

  return Module;

}());

