/* global FxaModuleErrors, MockL10n */
'use strict';

require('/shared/test/unit/mocks/mock_l20n.js');
requireApp('system/fxa/js/fxam_errors.js');

suite('Error manager', function() {
  var errorsObject = {
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
      message: 'fxa-coppa-failure-error-message3'
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
  var response;
  var realL10n;
  suiteSetup(function() {
    realL10n = document.l10n;
    document.l10n = MockL10n;
  });

  suiteTeardown(function() {
    document.l10n = realL10n;
  });


  setup(function() {
    response = {};
  });

  teardown(function() {
    response = null;
  });

  Object.keys(errorsObject).forEach(function(key) {
    test('Test ' + key, function() {
      response.error = key;
      var resp = FxaModuleErrors.responseToParams(response);

      var message = errorsObject[key].message;

      assert.deepEqual(resp, {
        title: errorsObject[key].title,
        message: message
      });
    });
  });

});
