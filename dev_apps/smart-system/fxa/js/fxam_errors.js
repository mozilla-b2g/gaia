/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function(exports) {

  var _ = navigator.mozL10n.get;

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
      message: 'fxa-coppa-failure-error-message'
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
    var msg;
    if (error == 'COPPA_ERROR') {
      msg = _getCoppaError();
    }
    return {
      title: _(l10nKeys.title),
      message: error == 'COPPA_ERROR' ? _getCoppaError() : _(l10nKeys.message)
    };
  }

  function _getCoppaError() {
    var coppaLink = 'http://www.ftc.gov/news-events/media-resources/' +
                    'protecting-consumer-privacy/kids-privacy-coppa';
    var errorText = _('fxa-coppa-failure-error-message');
    var learnMore = _('fxa-learn-more');
    var learnMorePlaceholder = '{{learnmore}}';
    var learnMoreLink = '<a href="' + coppaLink + '">' + learnMore + '</a>';
    // return as a string. fxam_error_overlay will innerHTML the whole message.
    return errorText.replace(learnMorePlaceholder, learnMoreLink);
  }

  var FxaModuleErrors = {
    responseToParams: function fxame_responseToParams(response) {
      return response && response.error ?
        _getError(response.error) : _getError('GENERIC_ERROR');
    }
  };

  exports.FxaModuleErrors = FxaModuleErrors;
}(window));
