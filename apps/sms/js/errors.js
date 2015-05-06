/* exported Errors */

(function(exports) {
  'use strict';

  /**
   * Maps error code to error description object:
   *   prefix: used as prefix for error message text/title l10nId,
   *   showRecipient: indicates whether recipients info should be included into
   *     error message displayed to the user;
   *   showDsdsStatus: indicates whether DSDS status should be included into
   *     error message displayed to the user;
   *   executeHandler: indicates whether confirmation handler passed to the
   *     error dialog should be executed once user selects confirm action.
   * @type {Map.<string, Object>}
   */
  const ERRORS = new Map();

  function initErrorsMap() {
    ERRORS.set('NoSimCardError', {
      prefix: 'sendMissingSimCard'
    });

    ERRORS.set('RadioDisabledError', {
      prefix: 'sendFlightMode'
    });

    ERRORS.set('FdnCheckError',{
      prefix: 'fdnError',
      showRecipient: true
    });

    ERRORS.set('NonActiveSimCardError', {
      prefix: 'switchSimToRetrieve',
      showDsdsStatus: true,
      executeHandler: true
    });

    ERRORS.set('NoSignalError', {
      prefix: 'sendNoSignalError'
    });

    ERRORS.set('NotFoundError', {
      prefix: 'sendNotFoundError'
    });

    ERRORS.set('InvalidAddressError', {
      prefix: 'sendInvalidAddressError'
    });

    ERRORS.set('SimNotMatchedError', {
      prefix: 'simNotMatchedError'
    });

    ERRORS.set('NonActiveSimCardToSendError', {
      prefix: 'switchSimToSend',
      showDsdsStatus: true,
      executeHandler: true
    });

    ERRORS.set('RadioDisabledToDownloadError', {
      prefix: 'radioDisabledToDownload'
    });

    // The error type below will be represented as "GeneralError" in dialog for
    // the rest of error codes (InternalError and etc.)
    ERRORS.set('UnknownError', {
      prefix: 'sendDefaultError'
    });
  }

  exports.Errors = {
    get: function(errorCode) {
      if (!ERRORS.size) {
        initErrorsMap();
      }

      return ERRORS.get(errorCode) || ERRORS.get('UnknownError');
    }
  };
})(window);
