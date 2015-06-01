/* jshint -W069 */
/* global Marionette */
(function(module, ns) {
  'use strict';

  var STATUSES = Object.freeze({
    'no such element': 'NoSuchElement',
    'no such frame': 'NoSuchFrame',
    'unknown command': 'UnknownCommand',
    'stale element reference': 'StaleElementReference',
    'element not visible': 'ElementNotVisible',
    'invalid element state': 'InvalidElementState',
    'unknown error': 'UnknownError',
    'element not selectable': 'ElementIsNotSelectable',
    'javascript error': 'JavaScriptError',
    'invalid xpath selector': 'XPathLookupError',
    'timeout': 'Timeout',
    'no such window': 'NoSuchWindow',
    'invalid cookie domain': 'InvalidCookieDomain',
    'unable to set cookie': 'UnableToSetCookie',
    'unexpected alert open': 'UnexpectedAlertOpen',
    'no such alert': 'NoAlertOpenError',
    'script timeout': 'ScriptTimeout',
    'invalid element coordinates': 'InvalidElementCoordinates',
    'invalid selector': 'InvalidSelector',
    'webdriver error': 'GenericError'
  });

  var CODES = Object.freeze({
    7: STATUSES['no such element'],
    8: STATUSES['no such frame'],
    9: STATUSES['unknown command'],
    10: STATUSES['stale element reference'],
    11: STATUSES['element not visible'],
    12: STATUSES['invalid element state'],
    13: STATUSES['unknown error'],
    15: STATUSES['element not selectable'],
    17: STATUSES['javascript error'],
    19: STATUSES['invalid xpath selector'],
    21: STATUSES['timeout'],
    23: STATUSES['no such window'],
    24: STATUSES['invalid cookie domain'],
    25: STATUSES['unable to set cookie'],
    26: STATUSES['unexpected alert open'],
    27: STATUSES['no such alert'],
    28: STATUSES['script timeout'],
    29: STATUSES['invalid element coordinates'],
    32: STATUSES['invalid selector'],
    500: STATUSES['webdriver error']
  });

  var DEFAULT_STATUS = STATUSES['webdriver error'];

  /**
   * Returns an error object given
   * a error object from the marionette client.
   * Expected input follows this format:
   *
   * Codes are from:
   * http://code.google.com/p/selenium/wiki/JsonWireProtocol#Response_Status_Codes
   *
   * Status strings are from:
   * https://w3c.github.io/webdriver/webdriver-spec.html#handling-errors
   *
   *    {
   *      message: "Something",
   *      stacktrace: "wentwrong@line",
   *      status: "javascript error"
   *    }
   *
   * @param {Client} client which the error originates from.
   * @param {Object} options for error (see above).
   */
  function MarionetteError(client, options) {
    var status = DEFAULT_STATUS;
    if (options.status in CODES)
      status = CODES[options.status];
    else if (options.status in STATUSES)
      status = STATUSES[options.status];

    this.client = client;
    this.type = status;
    this.name = this.type;

    this.message = this.name;
    if (options.message)
      this.message += ': ' + options.message;
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

  MarionetteError.STATUSES = STATUSES;
  MarionetteError.CODES = CODES;
  module.exports = MarionetteError;

}.apply(
  this,
  (this.Marionette) ?
    [Marionette('error'), Marionette] :
    [module, require('./marionette')]
));
