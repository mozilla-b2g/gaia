/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global CryptoJS */

/* exported ProvisioningAuthentication */

'use strict';

/**
 * Singleton object that authenticates the sender of the client provisioning
 * message.
 */
var ProvisioningAuthentication = (function() {
  /** The PIN introduced by the user */
  var pin = null;

  /** The object holding auth info */
  var auth = null;

  /**
   * Determines whether the sender (tipically the Client Provisioning server)
   * could be authenticate as the sender of the message.
   *
   * @param {String} pin The PIN introduced by the user.
   * @param {Object} auth An object containing some info such as the
   *                      security mechanism used, the MAC, the raw message
   *                      data in binary format (Uint8Array object).
   *
   * @return {Boolean}
   */
  function pa_isDocumentValid(userPin, authInfo) {
    pin = userPin;
    auth = authInfo;

    var sec = auth.sec;
    switch (sec) {
      case 'NETWPIN':
        // This function won't be called since gecko will be responsible for
        // authenticate the sender of client provisioning  messages with this
        // authentication mechanism. Let's throw an error.
        throw new Error('cp-finish-confirm-dialog-message-auth-error');
      case 'USERPIN':
        return pa_userPinAuthentication();
      case 'USERNETWPIN':
        return pa_userNetwPinAuthentication();
      case 'USERPINMAC':
        return pa_userPinMacAuthentication();
      default:
        throw new Error(
          'cp-finish-confirm-dialog-message-auth-unsupported-mechanism'
        );
    }
  }

  /**
   * Helper than handles USERPIN authentication mechanism.
   *
   * @return {Boolean} A flag that indicates the sender of the message could be
   *                   authenticated as valid.
   */
  function pa_userPinAuthentication() {
    var mac = auth.mac;

    return mac === pa_sign(pin, auth.data, auth.data.length);
  }

  /**
   * Helper than handles USERNETWPIN authentication mechanism.
   *
   * @return {Boolean} A flag that indicates the sender of the message could be
   *                   authenticated as valid.
   */
  function pa_userNetwPinAuthentication() {
    // TODO: This authentication mechanism must be handle somehow by gecko
    // as well. This is not supported yet. Let's throw an error then.
    throw new Error(
      'cp-finish-confirm-dialog-message-auth-unsupported-mechanism'
    );
  }

  /**
   * Helper than handles USERPINMAC authentication mechanism.
   *
   * @return {Boolean} A flag that indicates the sender of the message could be
   *                   authenticated as valid.
   */
  function pa_userPinMacAuthentication() {
    // TODO: This authentication mechanism has not been tested against a real
    // server so we have decided to leave it out from the implementation until
    // we are able to tested properly. Let's throw an error then.
    throw new Error(
      'cp-finish-confirm-dialog-message-auth-unsupported-mechanism'
    );
  }

  /**
   * Signs the message data. It performs a HMAC SHA1 signing method.
   *
   * @param {String} key The key string.
   * @param {Uint8Array} data The message data.
   * @param {Integer} dataLength The length of the message data.
   *
   * @return {String} The MAC we have generated.
   */
  function pa_sign(key, data, dataLength) {
    function bin2hex(buffer) {
        var i, f = 0, a = [], data = new Uint8Array(buffer);
        f = data.length;
        for (i = 0; i < f; i++) {
            a[i] = data[i].toString(16).replace(/^([\da-f])$/, '0$1');
        }
        return a.join('');
    }

    var _data = new Uint8Array(dataLength);
    for (var i = 0; i < dataLength; i++) {
      _data[i] = data[i];
    }

    var hmac = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA1, key);
    var words = CryptoJS.enc.Hex.parse(bin2hex(_data));

    hmac.update(words);
    var hash = hmac.finalize();

    return hash.toString(CryptoJS.enc.Hex).toUpperCase();
  }

  return {
    isDocumentValid: pa_isDocumentValid
  };
})();
