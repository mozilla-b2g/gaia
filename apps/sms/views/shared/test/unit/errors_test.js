/*global Errors */

'use strict';

require('/views/shared/js/errors.js');

suite('Errors', function() {
  test('Gets default value for unknown error code', function() {
    var defaultError = Errors.get('UnknownError');

    assert.isNotNull(defaultError);
    assert.isString(defaultError.prefix);
    assert.deepEqual(defaultError, Errors.get('I do not know this error!'));
  });

  test('Gets correct error description for known error code', function() {
    var defaultError = Errors.get('UnknownError');

    var knownErrorCodes = [
      'NoSignalError', 'NotFoundError', 'FdnCheckError', 'InvalidAddressError',
      'NoSimCardError', 'RadioDisabledError', 'NonActiveSimCardError',
      'SimNotMatchedError', 'NonActiveSimCardToSendError',
      'RadioDisabledToDownloadError'
    ];

    knownErrorCodes.forEach((code) => {
      var error = Errors.get(code);

      assert.isNotNull(error);
      assert.isString(error.prefix);
      assert.notEqual(error, defaultError);
    });
  });
});
