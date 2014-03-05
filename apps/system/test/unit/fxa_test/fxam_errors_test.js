'use strict';

requireApp('system/test/unit/mock_l10n.js');
requireApp('system/fxa/js/fxam_errors.js');

suite('Error manager', function() {
  var errorsObject = {
    'ACCOUNT_DOES_NOT_EXIST': 'account-does-not-exist',
    'CANNOT_CREATE_ACCOUNT': 'cannot-create',
    'RESET_PASSWORD_ERROR': 'reset-password-error',
    'INVALID_ACCOUNTID': 'invalid-email',
    'INVALID_PASSWORD': 'invalid-password',
    'ALREADY_SIGNED_IN_USER': 'already-signed-in',
    'INTERNAL_ERROR_INVALID_USER': 'generic-error',
    'SERVER_ERROR': 'generic-error',
    'NO_TOKEN_SESSION': 'generic-error',
    'GENERIC_ERROR': 'generic-error',
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

  test('Can not create account error', function() {

    response.error = 'CANNOT_CREATE_ACCOUNT';
    FxaModuleErrors.responseToParams(response);

    assert.ok(navigator.mozL10n.get.calledWith(
      'fxa-' + errorsObject[response.error] + '-title'
    ));
    assert.ok(navigator.mozL10n.get.calledWith(
      'fxa-' + errorsObject[response.error] + '-message')
    );
  });

  test('Can not reset password', function() {
    response.error = 'RESET_PASSWORD_ERROR';
    FxaModuleErrors.responseToParams(response);

    assert.ok(navigator.mozL10n.get.calledWith(
      'fxa-' + errorsObject[response.error] + '-title')
    );
    assert.ok(
      navigator.mozL10n.get.calledWith(
        'fxa-' + errorsObject[response.error] + '-message')
    );
  });

  test('Invalid account ID', function() {
    response.error = 'INVALID_ACCOUNTID';
    FxaModuleErrors.responseToParams(response);

    assert.ok(navigator.mozL10n.get.calledWith(
      'fxa-' + errorsObject[response.error] + '-title')
    );
    assert.ok(
      navigator.mozL10n.get.calledWith(
        'fxa-' + errorsObject[response.error] + '-message')
    );
  });

  test('Invalid password', function() {
    response.error = 'INVALID_PASSWORD';
    FxaModuleErrors.responseToParams(response);

    assert.ok(navigator.mozL10n.get.calledWith(
      'fxa-' + errorsObject[response.error] + '-title')
    );
    assert.ok(navigator.mozL10n.get.calledWith(
      'fxa-' + errorsObject[response.error] + '-message')
    );
  });

  test('There is a user already signed', function() {
    response.error = 'ALREADY_SIGNED_IN_USER';
    FxaModuleErrors.responseToParams(response);

    assert.ok(navigator.mozL10n.get.calledWith(
      'fxa-' + errorsObject[response.error] + '-title')
    );
    assert.ok(navigator.mozL10n.get.calledWith(
      'fxa-' + errorsObject[response.error] + '-message')
    );
  });

  test('Internal error, invalid user', function() {
    response.error = 'INTERNAL_ERROR_INVALID_USER';
    FxaModuleErrors.responseToParams(response);

    assert.ok(navigator.mozL10n.get.calledWith(
      'fxa-' + errorsObject[response.error] + '-title')
    );
    assert.ok(navigator.mozL10n.get.calledWith(
      'fxa-' + errorsObject[response.error] + '-message')
    );
  });

  test('Server error', function() {
    response.error = 'SERVER_ERROR';
    FxaModuleErrors.responseToParams(response);

    assert.ok(navigator.mozL10n.get.calledWith(
      'fxa-' + errorsObject[response.error] + '-title')
    );
    assert.ok(navigator.mozL10n.get.calledWith(
      'fxa-' + errorsObject[response.error] + '-message')
    );
  });

  test('There is no token', function() {
    response.error = 'NO_TOKEN_SESSION';
    FxaModuleErrors.responseToParams(response);

    assert.ok(navigator.mozL10n.get.calledWith(
      'fxa-' + errorsObject[response.error] + '-title')
    );
    assert.ok(navigator.mozL10n.get.calledWith(
      'fxa-' + errorsObject[response.error] + '-message')
    );
  });

  test('Generic error', function() {
    response.error = 'GENERIC_ERROR';
    FxaModuleErrors.responseToParams(response);

    assert.ok(navigator.mozL10n.get.calledWith(
      'fxa-' + errorsObject[response.error] + '-title')
    );
    assert.ok(navigator.mozL10n.get.calledWith(
      'fxa-' + errorsObject[response.error] + '-message')
    );
  });

  test('Account does not exist', function() {
    response.error = 'ACCOUNT_DOES_NOT_EXIST';
    FxaModuleErrors.responseToParams(response);

    assert.ok(navigator.mozL10n.get.calledWith(
      'fxa-' + errorsObject[response.error] + '-title'
    ));
    assert.ok(navigator.mozL10n.get.calledWith(
      'fxa-' + errorsObject[response.error] + '-message')
    );
  });

  test('Unknown error', function() {
    response.error = 'UNKNOWN';
    FxaModuleErrors.responseToParams(response);

    assert.ok(navigator.mozL10n.get.calledWith(
      'fxa-' + errorsObject[response.error] + '-title'
    ));
    assert.ok(navigator.mozL10n.get.calledWith(
      'fxa-' + errorsObject[response.error] + '-message')
    );
  });

});
