/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

'use strict';

/* global SynctoServerFixture */
/* exported FxSyncWebCrypto */

requireApp('sharedtest/test/unit/sync/fixtures/synctoserver.js');

var FxSyncWebCrypto = function() {};
FxSyncWebCrypto.responses = [];

FxSyncWebCrypto.prototype = {
  setKeys: function(kB, cryptoKeys) {
    this.shouldWork = true;
    if ([SynctoServerFixture.syncEngineOptions.kB,
        '85c4f8c1d8e3e2186824c127af786891dd03c6e05b1b45f28f7181211bf2affb']
        .indexOf(kB) === -1) {
      this.shouldWork = false;
    }
    var correctCryptoKeys = JSON.parse(
        SynctoServerFixture.remoteData.crypto[0].payload);
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
        SynctoServerFixture.remoteData.history[0].payload);
    if (this.shouldWork &&
        record.ciphertext === decryptablePayload.ciphertext &&
        record.IV === decryptablePayload.IV &&
        record.hmac === decryptablePayload.hmac) {
      return Promise.resolve(
          SynctoServerFixture.historyEntryDec.payload);
    }
    if (FxSyncWebCrypto.responses.length) {
      return Promise.resolve(FxSyncWebCrypto.responses.shift());
    }
    return Promise.reject(new Error(
        'payload.ciphertext is not a Base64 string'));
  }
};
