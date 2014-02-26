'use strict';

requireApp('system/test/unit/mock_l10n.js');
requireApp('system/fxa/js/fxam_errors.js');

suite('Error manager', function() {
  var errorsObject = {
    'ACCOUNT_DOES_NOT_EXIST': 'account-does-not-exist',
    'CANNOT_CREATE_ACCOUNT': 'cannot-create',
    'RESET_PASSWORD_ERROR': 'reset-password-error',
    'RESET_PASSWORD_IN_SETTINGS': 'reset-password-in-settings',
    'INVALID_ACCOUNTID': 'invalid-email',
    'INVALID_PASSWORD': 'invalid-password',
    'ALREADY_SIGNED_IN_USER': 'already-signed-in',
    'INTERNAL_ERROR_INVALID_USER': 'generic-error',
    'SERVER_ERROR': 'generic-error',
    'NO_TOKEN_SESSION': 'generic-error',
    'GENERIC_ERROR': 'generic-error',
    'UNKNOWN': 'unknown-error',
    'COPPA_ERROR': 'coppa-error'
  };
  var response;
  var realL10n;
  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
  });


  setup(function() {
    response = {};
    this.sinon.spy(navigator.mozL10n, 'get');
  });

  teardown(function() {
    response = null;
  });

  Object.keys(errorsObject).forEach(function(key) {
    test('Test ' + key, function() {
      sinon.spy(navigator.mozL10n.get);
      response.error = key;
      FxaModuleErrors.responseToParams(response);

      sinon.assert.calledWith(
        navigator.mozL10n.get,
        'fxa-' + errorsObject[key] + '-title'
      );
      sinon.assert.calledWith(
        navigator.mozL10n.get,
        'fxa-' + errorsObject[key] + '-message'
      );
    });
  });

});
