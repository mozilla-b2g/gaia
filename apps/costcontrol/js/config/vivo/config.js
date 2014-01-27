/* global Format, ConfigManager */

'use strict';

var VivoConfig = (function() {

  var RESERVED = '0';
  var OPERATION_TYPE_REQUEST = '01';
  var OPERATION_CHECK_BALANCE = '0102';
  var MESSAGE_INIT_WIDTH = 32;

  var THOUSANDS_PADDING = 4;
  var TENS_PADDING = 2;

  function pad(number, width) {
    number = '' + number;
    var length = number.length;
    var remainder = width - length;
    return remainder < 0 ? number :
                           (new Array(remainder + 1)).join('0') + number;
  }

  function getDateTime() {
    var now = new Date();
    var date = [
      pad(now.getUTCFullYear(), THOUSANDS_PADDING),
      pad(now.getUTCMonth() + 1, TENS_PADDING),
      pad(now.getUTCDate(), TENS_PADDING)
    ].join('');
    var time = [
      pad(now.getUTCHours(), TENS_PADDING),
      pad(now.getUTCMinutes(), TENS_PADDING),
      pad(now.getUTCSeconds(), TENS_PADDING)
    ].join('');
    return [date, time];
  }

  /*
   * VIVO request messages are formed by the concatenation of fixed length
   * fields:
   * - 32-length initial padding, all '0' (zero)
   * -  3-length system code. Currently only 'OWD' (FirefoOS) is supported
   * -  8-length date string in the form of YYYYMMDD
   * -  6-length time string in the form of HHMMSS
   * -  2-length operation type
   * -  1-length total number of SMS for the request
   * -  1-length number of the current SMS being transmitted (starting in 1)
   * -  1-length reserved character. It is '0'
   * -  4-length operation code
   *
   * Example of balance request (ignore blank spaces):
   * 00000000000000000000000000000000 OWD 20130530 132006 01 1 1 0 0102
   *
   * A request can include parameters in a last field of variable length from
   * 0 to 80 characters.
   */
  function generateCheckBalanceMessage() {
    var messageInit = (new Array(MESSAGE_INIT_WIDTH + 1)).join('0');
    var systemCode = 'OWD';
    var dateTime = getDateTime();
    var date = dateTime[0];
    var time = dateTime[1];
    var operationType = OPERATION_TYPE_REQUEST;
    var totalMessageCount = '1';
    var currentMessageCount = '1';
    var requestedOperation = OPERATION_CHECK_BALANCE;

    return [
      messageInit,
      systemCode,
      date,
      time,
      operationType,
      totalMessageCount,
      currentMessageCount,
      RESERVED,
      requestedOperation
    ].join('');
  }

  /*
   * TODO:
   * A VIVO answer include specific fields from the related request in such
   * a way these fields form a unique ID to match each answer with its request.
   *
   * For example, compare this pair of request, response:
   * 00000000000000000000000000000000 OWD 20130530 132006 01 1 1 0 0102
   *                                      20130530 132006 01 1 1 0 0102 60.45
   *
   * Current value for the regexp used to validate a balance answer is not
   * checking the unique ID since this requires to store this ID and make it
   * to survive the application closes. Since access to configuration
   * properties must be synchronous, we should use some kind of synchronous
   * storage. As DOMStorage is discouraged and IndexedDB synchronous API is
   * not ready we can not currently implement this constrain.
   */
  var balanceRegularExpression = [
    '^[0-9]{14}', // we admit any sequence of 14 numbers. See TODO above.
    OPERATION_TYPE_REQUEST,
    '1', '1',
    RESERVED,
    OPERATION_CHECK_BALANCE,
    '([0-9]+)\\.([0-9]{1,2})' // matches the remaining balance
  ].join('');

  return {
    provider: 'Vivo',
    is_free: true,
    is_roaming_free: true,
    credit: { currency: 'R$' },
    balance: {
      destination: '4850',
      get text() {
        return generateCheckBalanceMessage();
      },
      senders: ['4850'],
      regexp: balanceRegularExpression,
      minimum_delay: 3 * 60 * 60 * 1000 // 3h
    },
    topup: {
      destination: '7000',
      ussd_destination: '*321#',
      text: '&code',
      senders: ['1515', '7000'],
      confirmation_regexp:
        'Voce recarregou R\\$\\s*([0-9]+)(?:[,\\.]([0-9]+))?',
      incorrect_code_regexp:
        '(Favor enviar|envie novamente|Verifique) o codigo de recarga'
    },
    default_low_limit_threshold: 3
  };
}());

ConfigManager.setConfig(VivoConfig);
