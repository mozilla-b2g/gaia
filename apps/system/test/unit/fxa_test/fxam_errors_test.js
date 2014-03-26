'use strict';

requireApp('system/test/unit/mock_l10n.js');
requireApp('system/fxa/js/fxam_errors.js');

suite('Error manager', function() {
  var errorsObject = {
    'CONNECTION_ERROR': 'connection-error',
    'RESET_PASSWORD_ERROR': 'reset-password-error',
    'INVALID_EMAIL': 'invalid-email',
    'INVALID_PASSWORD': 'invalid-password',
    'COPPA_ERROR': 'coppa-failure-error'
    'OFFLINE': 'offline-error',
    'UNKNOWN': 'unknown-error'
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
