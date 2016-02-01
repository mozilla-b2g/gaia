/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

'use strict';

/* global SynctoServerFixture */
/* exported FxSyncWebCrypto */

requireApp('sharedtest/test/unit/sync/fixtures/synctoserver.js');

var FxSyncWebCrypto = function() {};
FxSyncWebCrypto.prototype = {
  setKeys: function(kB, cryptoKeys) {
    this.shouldWork = true;
    if (kB !== SynctoServerFixture.syncEngineOptions.kB) {
      this.shouldWork = false;
    }
    var correctCryptoKeys = JSON.parse(
        SynctoServerFixture.remoteData.crypto.payload);
    if (cryptoKeys.ciphertext !== correctCryptoKeys.ciphertext ||
        cryptoKeys.IV !== correctCryptoKeys.IV ||
        cryptoKeys.hmac !== correctCryptoKeys.hmac) {
      this.shouldWork = false;
    }
    if (this.shouldWork) {
      this.bulkKeyBundle = true;
      return Promise.resolve();
    }
    return Promise.reject(`SyncKeys hmac could not be verified with current mai\
n key`);
  },
  encrypt: function(payload) {
    if (this.shouldWork) {
      return Promise.resolve({ mockEncrypted: JSON.stringify(payload) });
    }
    return Promise.reject();
  },
  decrypt: function(record) {
    var decryptablePayload = JSON.parse(
        SynctoServerFixture.remoteData.history.payload);
    if (this.shouldWork &&
        record.ciphertext === decryptablePayload.ciphertext &&
        record.IV === decryptablePayload.IV &&
        record.hmac === decryptablePayload.hmac) {
      return Promise.resolve(
          SynctoServerFixture.historyEntryDec.payload);
    }
    return Promise.reject(new Error(
        'payload.ciphertext is not a Base64 string'));
  }
};
