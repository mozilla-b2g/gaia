
'use strict';

// Define the states of the firefox accounts signup/signin flow.
// The object key defines the state name, the value is the
// URL hash of the screen to show. done is a special state that has no
// corresponding screen.

window.FirefoxAccountsStates = {
  INTRO: '#ff-account-intro-screen',
  ENTER_EMAIL: '#ff-account-enter-email-screen',
  SET_PASSWORD: '#ff-account-set-password-screen',
  ENTER_PASSWORD: '#ff-account-enter-password-screen',
  SIGNUP_SUCCESS: '#ff-account-signup-success-screen',
  SIGNIN_SUCCESS: '#ff-account-signin-success-screen',
  PASSWORD_RESET_SUCCESS: '#ff-account-reset-password-screen',
  DONE: null
};

