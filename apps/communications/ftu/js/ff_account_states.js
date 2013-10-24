
'use strict';

// Define the states of the firefox accounts signup/signin flow.
// The object key defines the state name, the value is the
// URL hash of the screen to show. done is a special state that has no
// corresponding screen.

window.FirefoxAccountsStates = {
  INTRO: '#ff-account-intro-screen',
  ENTER_EMAIL: '#ff-account-enter-email-screen',
  CREATE_PASSWORD: '#ff-account-create-password-screen',
  ENTER_PASSWORD: '#ff-account-enter-password-screen',
  DONE: null
};

