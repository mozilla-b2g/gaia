/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function(exports) {
  var Errors = {
    CONNECTION_ERROR: {
      title: 'fxa-connection-error-title',
      message: 'fxa-connection-error-message'
    },
    RESET_PASSWORD_ERROR: {
      title: 'fxa-reset-password-error-title',
      message: 'fxa-reset-password-error-message'
    },
    INVALID_EMAIL: {
      title: 'fxa-invalid-email-title',
      message: 'fxa-invalid-email-message'
    },
    INVALID_PASSWORD: {
      title: 'fxa-invalid-password-title',
      message: 'fxa-invalid-password-message'
    },
    COPPA_ERROR: {
      title: 'fxa-coppa-failure-error-title',
      message: 'fxa-coppa-failure-error-message2'
    },
    COPPA_FTU_ERROR: {
      title: 'fxa-coppa-failure-error-title',
      message: 'fxa-coppa-ftu-error-message'
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
    var l10nKeys = Errors[error] || Errors.UNKNOWN;
    return {
      title: l10nKeys.title,
      message: l10nKeys.message
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
