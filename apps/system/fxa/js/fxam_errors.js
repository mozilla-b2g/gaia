/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function(exports) {

  var Errors = {
    ACCOUNT_DOES_NOT_EXIST: {
      title: 'fxa-account-does-not-exist-title',
      message: 'fxa-account-does-not-exist-message'
    },
    CANNOT_CREATE_ACCOUNT: {
      title: 'fxa-cannot-create-title',
      message: 'fxa-cannot-create-message'
    },
    RESET_PASSWORD_ERROR: {
      title: 'fxa-reset-password-error-title',
      message: 'fxa-reset-password-error-message'
    },
    RESET_PASSWORD_IN_SETTINGS: {
      title: 'fxa-reset-password-in-settings-title',
      message: 'fxa-reset-password-in-settings-message'
    },
    INVALID_ACCOUNTID: {
      title: 'fxa-invalid-email-title',
      message: 'fxa-invalid-email-message'
    },
    INVALID_PASSWORD: {
      title: 'fxa-invalid-password-title',
      message: 'fxa-invalid-password-message'
    },
    ALREADY_SIGNED_IN_USER: {
      title: 'fxa-already-signed-in-title',
      message: 'fxa-already-signed-in-message'
    },
    INTERNAL_ERROR_INVALID_USER: {
      title: 'fxa-generic-error-title',
      message: 'fxa-generic-error-message'
    },
    SERVER_ERROR: {
      title: 'fxa-generic-error-title',
      message: 'fxa-generic-error-message'
    },
    NO_TOKEN_SESSION: {
      title: 'fxa-generic-error-title',
      message: 'fxa-generic-error-message'
    },
    GENERIC_ERROR: {
      title: 'fxa-generic-error-title',
      message: 'fxa-generic-error-message'
    },
    OFFLINE: {
      title: 'fxa-offline-error-title',
      message: 'fxa-offline-error-message'
    },
    UNKNOWN: {
      title: 'fxa-unknown-error-title',
      message: 'fxa-unknown-error-message'
    }
  };

  function _getError(error) {
    var _ = navigator.mozL10n.get;
    var l10nKeys = Errors[error] || Errors.UNKNOWN;
    return {
      title: _(l10nKeys.title),
      message: _(l10nKeys.message)
    };
  }

  var FxaModuleErrors = {
    responseToParams: function fxame_responseToParams(response) {
      return response && response.error ?
        _getError(response.error) : _getError('GENERIC_ERROR');
    }
  };

  exports.FxaModuleErrors = FxaModuleErrors;
}(window));
