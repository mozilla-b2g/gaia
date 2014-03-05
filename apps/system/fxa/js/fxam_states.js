/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/*
 * Define the states of the firefox accounts signup/signin flow.
 * The object key defines the state name, the value is the
 * URL hash of the screen to show. done is a special state that has no
 * corresponding screen.
 */

var FxaModuleStates = (function() {
  return {
    ENTER_EMAIL: {
      id: 'fxa-email',
      module: 'FxaModuleEnterEmail'
    },
    SET_PASSWORD: {
      id: 'fxa-set-password',
      module: 'FxaModuleSetPassword'
    },
    ENTER_PASSWORD: {
      id: 'fxa-enter-password',
      module: 'FxaModuleEnterPassword'
    },
    SIGNUP_SUCCESS: {
      id: 'fxa-signup-success',
      module: 'FxaModuleSignupSuccess'
    },
    SIGNIN_SUCCESS: {
      id: 'fxa-signin-success',
      module: 'FxaModuleSigninSuccess'
    },
    PASSWORD_RESET_SUCCESS: {
      id: 'fxa-password-reset-success',
      module: 'FxaModulePasswordResetSuccess'
    },
    REFRESH_AUTH: {
      id: 'fxa-refresh-auth',
      module: 'FxaModuleRefreshAuth'
    },
    TOS: {
      id: 'fxa-tos'
    },
    PP: {
      id: 'fxa-pp'
    },
    DONE: null,
    back: function() {
      FxaModuleNavigation.back();
    },
    setState: function setState(state) {
      if ((! state in this) || typeof state === 'function') return;
      document.location.hash = state.id;
    }
  };
}());

