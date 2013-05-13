(function(module, ns) {

  var code, errorCodes, Err = {};

  Err.codes = errorCodes = {
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
  };

  Err.Exception = Error;
  //used over Object.create intentionally
  Err.Exception.prototype = new Error();

  for (code in errorCodes) {
    (function(code) {
      Err[errorCodes[code]] = function(obj) {
        var message = '',
            err = new Error();

        if (obj.status) {
          message += '(' + obj.status + ') ';
        }

        message += (obj.message || '');
        message += '\nRemote Stack:\n';
        message += obj.stacktrace || '<none>';

        this.message = message;
        this.type = errorCodes[code];
        this.name = this.type;
        this.fileName = err.fileName;
        this.lineNumber = err.lineNumber;

        if (err.stack) {
          // remove one stack level:
          if (typeof(Components) != 'undefined') {
            // Mozilla:
            this.stack = err.stack.substring(err.stack.indexOf('\n') + 1);
          } else if ((typeof(chrome) != 'undefined') ||
                     (typeof(process) != 'undefined')) {
            // Google Chrome/Node.js:
            this.stack = err.stack.replace(/\n[^\n]*/, '');
          } else {
            this.stack = err.stack;
          }
        }
      }
      Err[errorCodes[code]].prototype = new Err.Exception();
    }(code));
  }

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
   * @param {Object} obj remote error object.
   */
  Err.error = function exception(obj) {
    if (obj instanceof Err.Exception) {
      return obj;
    }

    if (obj.status in errorCodes) {
      return new Err[errorCodes[obj.status]](obj);
    } else {
      if (obj.message || obj.stacktrace) {
        return new Err.GenericError(obj);
      }
      return obj;
    }
  }

  module.exports = Err;

}.apply(
  this,
  (this.Marionette) ?
    [Marionette('error'), Marionette] :
    [module, require('./marionette')]
));
