/**
 * Display the signup success message to the user.
 */
FirefoxAccountSignUpSuccess = (function() {
  'use strict';

  var states = FirefoxAccountsStates;
  var EMAIL_SELECTOR = '#ff_account--signup_success--email';

  function $(selector) {
    return document.querySelector(selector);
  }

  function getNextState(done) {
    return done(states.DONE);
  }

  var Module = {
    init: function(options) {
      options = options || {};
      $(EMAIL_SELECTOR).innerHTML = options.email;
    },
    forward: function(gotoNextStepCallback) {
      getNextState(gotoNextStepCallback);
    }
  };

  return Module;

}());

