(function(module, ns) {

  var DEFAULT_CODE = 500;
  var CODES = Object.freeze({
   7: 'NoSuchElement',
   8: 'NoSuchFrame',
   9: 'UnknownCommand',
   10: 'StaleElementReference',
   11: 'ElementNotVisible',
   12: 'InvalidElementState',
   13: 'UnknownError',
   15: 'ElementIsNotSelectable',
   17: 'JavaScriptError',
   19: 'XPathLookupError',
   21: 'Timeout',
   23: 'NoSuchWindow',
   24: 'InvalidCookieDomain',
   25: 'UnableToSetCookie',
   26: 'UnexpectedAlertOpen',
   27: 'NoAlertOpenError',
   28: 'ScriptTimeout',
   29: 'InvalidElementCoordinates',
   30: 'IMENotAvailable',
   31: 'IMEEngineActivationFailed',
   32: 'InvalidSelector',
   500: 'GenericError'
  });

  /**
   * Returns an error object given
   * a error object from the marionette client.
   * Expected input follows this format:
   *
   * Codes are from:
   * http://code.google.com/p/selenium/wiki/JsonWireProtocol#Response_Status_Codes
   *
   *    {
   *      message: "Something",
   *      stacktrace: "wentwrong@line",
   *      status: 17
   *    }
   *
   * @param {Object} options for error (see above).
   */
  function MarionetteError(options) {
    if (options instanceof MarionetteError)
      return options;

    // default to unknown error
    var code = options.status || DEFAULT_CODE;

    if (!(code in CODES))
      code = DEFAULT_CODE;

    this.type = this.name = CODES[code];
    this.message = '';

    if (code) {
      this.message += '(' + code + ') ';
    }

    this.message += (options.message || '');
    this.message += '\nRemote Stack:\n';
    this.message += options.stacktrace || '<none>';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this);
    } else {
      // elsewhere we do horrible try/catch
      try {
        throw new Error();
      } catch (e) {
        this.stack = e.stack;
      }
    }
  }

  MarionetteError.prototype = Object.create(Error.prototype, {
    constructor: {
      value: Error
    }
  });

  MarionetteError.CODES = CODES;
  module.exports = MarionetteError;

}.apply(
  this,
  (this.Marionette) ?
    [Marionette('error'), Marionette] :
    [module, require('./marionette')]
));
