/*
Copyright 2015, Mozilla Foundation

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

'use strict';

/* global
  crypto,
  KeyDerivation,
  StringConversion
*/

/* exported
  FxSyncWebCrypto
*/

// WebCrypto-based client for Firefox Sync.

const FxSyncWebCrypto = Object.freeze((() => {

  const HKDF_INFO_STR = 'identity.mozilla.com/picl/v1/oldsync';

  const importKeyBundle = (aesKeyAB, hmacKeyAB) => {
    const pAes = crypto.subtle.importKey('raw', aesKeyAB,
                                       { name: 'AES-CBC', length: 256 },
                                       true, [ 'encrypt', 'decrypt' ]);
    const pHmac =  crypto.subtle.importKey('raw', hmacKeyAB,
                                         { name: 'HMAC', hash: 'SHA-256' },
                                         true, [ 'sign', 'verify' ]);
    return Promise.all([pAes, pHmac]).then(results => {
      return Object.freeze({
        aes: results[0],
        hmac: results[1]
      });
    }, () => {
      // err might be a TypeError if aesKeyAB or hmacKeyAB was no ArrayBuffer.
      throw new Error('Could not import key bundle. (1001)');
    });
  };

  const importKb = function(kBByteArray) {
    // The number 64 here comes from
    // (256 bits for AES + 256 bits for HMAC) / (8 bits per byte).
    return KeyDerivation.hkdf(kBByteArray,
                              StringConversion.stringToUtf8Uint8Array(
                                  HKDF_INFO_STR),
                              new Uint8Array(64), 64).then(output => {
      const aesKeyAB = output.slice(0, 32).buffer;
      const hmacKeyAB = output.slice(32).buffer;
      return Object.freeze(importKeyBundle(aesKeyAB, hmacKeyAB));
    });
  };

  const verifySyncKeys = function(
      signedTextByteArray,
      cryptoKeysHmacByteArray,
      hmacKey) {
    return crypto.subtle.verify({ name: 'HMAC', hash: 'AES-256' },
        hmacKey, cryptoKeysHmacByteArray, signedTextByteArray);
  };

  const importSyncKeys = function(
      cryptoKeysIVByteArray,
      cryptoKeysCiphertextByteArray,
      aesKey) {
    return crypto.subtle.decrypt({ name: 'AES-CBC', iv: cryptoKeysIVByteArray },
                                 aesKey,
                                 cryptoKeysCiphertextByteArray)
        .then(keyBundleAB => {
      const cryptoKeysJSON = String.fromCharCode.apply(
          null,
          new Uint8Array(keyBundleAB));
      var bulkKeyBundle;
      try {
        bulkKeyBundle = JSON.parse(cryptoKeysJSON);
        return importKeyBundle(
            StringConversion.base64StringToUint8Array(
                bulkKeyBundle.default[0]),
            StringConversion.base64StringToUint8Array(
                bulkKeyBundle.default[1])).then(keyBundle => {
          bulkKeyBundle.defaultAsKeyBundle = keyBundle;
          return Object.freeze(bulkKeyBundle);
        });
      } catch(e) {
        throw new Error('Deciphered crypto keys, but not JSON (1002)');
      }
    }, () => {
      throw new Error(`Could not decrypt crypto keys using AES part of stretche\
d kB key (1003)`);
    });
  };

  const importFromStrings = (obj) => {
    const ret = {};
    try {
      ret.ciphertext = StringConversion.
        base64StringToUint8Array(obj.ciphertext);
    } catch (e) {
      throw new Error('Could not parse ciphertext as a base64 string (1004)');
    }

    // Intentionally using StringConversion.stringToUtf8Uint8Array
    // instead of StringConversion.base64StringToUint8Array on the ciphertext
    // here - see https://github.com/mozilla/firefox-ios/blob/ \
    // 1cce59c8eac282e151568f1204ffbbcc27349eff/Sync/KeyBundle.swift#L178.
    ret.hmacSignedText = StringConversion
      .stringToUtf8Uint8Array(obj.ciphertext);

    try {
      ret.IV = StringConversion.base64StringToUint8Array(obj.IV);
    } catch (e) {
      throw new Error('Could not parse IV as a base64 string (1005)');
    }
    try {
      ret.hmacSignature = StringConversion.hexStringToUint8Array(obj.hmac);
    } catch (e) {
      throw new Error('Could not parse hmac as a hex string (1006)');
    }
    return Object.freeze(ret);
  };

  const getBulkKeyBundle = (kBByteArray, cryptoKeys) => {
    return importKb(kBByteArray).then(mainSyncKey => {
      return verifySyncKeys(cryptoKeys.hmacSignedText,
                                  cryptoKeys.hmacSignature,
                                  mainSyncKey.hmac).then(verified => {
        if (verified) {
          return importSyncKeys(cryptoKeys.IV,
                                cryptoKeys.ciphertext,
                                mainSyncKey.aes);
        }
        throw new Error(`SyncKeys hmac could not be verified with current main \
key (1007)`);
      });
    });
  };

  /*
   * setKeys - import kB and crypto/keys
   *
   * @param {String} kB Hex string with kB from FxA onepw protocol
   * @param {Object} cryptoKeysStrings Object with:
   *     - ciphertext {String} A Base64 String containing an AES-CBC ciphertext
   *     - IV {String} A Base64 String containing the AES-CBC Initialization
   *         Vector
   *     - hmac {String} A Hex String containing the HMAC-SHA256 signature
   * @returns {Promise} A promise that will resolve after importing kB,
   *     decrypting cryptoKeys, and setting this.bulkKeyBundle.
   */
  const setKeys = function(kB, cryptoKeysStrings) {
    var kBByteArray, cryptoKeys;

    // Input checking.
    try {
      kBByteArray = StringConversion.hexStringToUint8Array(kB);
    } catch (e) {
      return Promise.reject(new Error(`Could not parse kB as a hex string (1008\
)`));
    }

    try {
      cryptoKeys = importFromStrings(cryptoKeysStrings);
    } catch(err) {
      return Promise.reject(err);
    }

    return getBulkKeyBundle(kBByteArray, cryptoKeys).then(bulkKeyBundle => {
      this.bulkKeyBundle = bulkKeyBundle;
    });
  };

  /*
   * decrypt - verify and decrypt a Weave Basic Object
   *
   * @param {Object} payloadStrings Object with:
   *     - ciphertext {String} A Base64 String containing an AES-CBC ciphertext
   *     - IV {String} A Base64 String containing the AES-CBC Initialization
   *         Vector
   *     - hmac {String} A Hex String containing the HMAC-SHA256 signature
   * @param {String} collectionName String The name of the Sync collection
   *     (currently ignored, see
   *     https://github.com/michielbdejong/fxsync-webcrypto/issues/19)
   * @returns {Promise} A promise for the decrypted Weave Basic Object.
   */
  const decrypt = function(payloadStrings, collectionName) {
    if (typeof payloadStrings !== 'object') {
      return Promise.reject(new Error(`PayloadStrings is not an object (1009\
)`));
    }
    if (typeof collectionName !== 'string') {
      return Promise.reject(new Error('collectionName is not a string (1010)'));
    }

    var keyBundle;

    try {
      keyBundle = this.bulkKeyBundle.defaultAsKeyBundle;
    } catch(e) {
      return Promise.reject(new Error(`No key bundle found for \
${collectionName} - did you call setKeys? (1011)`));
    }

    const payload = importFromStrings(payloadStrings);
    return crypto.subtle.verify({ name: 'HMAC', hash: 'SHA-256' },
                                keyBundle.hmac, payload.hmacSignature,
                                payload.hmacSignedText).then(result => {
      if (!result) {
        throw new Error(`Record verification failed with current hmac key for \
${collectionName} (1012)`);
      }
    }).then(() => {
      return crypto.subtle.decrypt({ name: 'AES-CBC', iv: payload.IV },
                                   keyBundle.aes,
                                   payload.ciphertext)
          .then(recordArrayBuffer => {
        var recordObj;
        // recordArrayBuffer which is the cleartext payload from FxSync contains
        // UTF-8 JSON.
        const recordJSON = StringConversion.utf8Uint8ArrayToString(
            new Uint8Array(recordArrayBuffer));
        try {
          recordObj = JSON.parse(recordJSON);
        } catch(e) {
          throw new Error('Deciphered record, but not JSON (1013)');
        }
        return recordObj;
      }, () => {
        throw new Error(`Could not decrypt record using AES part of key bundle \
for collection ${collectionName} (1014)`);
      });
    });
  };

  const encryptAndSign = (keyBundle, cleartext) => {
    // Generate a random IV using the PRNG of the device.
    var IV = new Uint8Array(16);
    crypto.getRandomValues(IV);
    return crypto.subtle.encrypt({ name: 'AES-CBC', iv: IV }, keyBundle.aes,
                                 cleartext).then(ciphertext => {
      const ciphertextB64 = StringConversion.arrayBufferToBase64String(
          ciphertext);
      return crypto.subtle.sign({ name: 'HMAC', hash: 'SHA-256' },
                                keyBundle.hmac,
                                StringConversion.stringToUtf8Uint8Array(
                                    ciphertextB64)).
          then(hmac => {
        return {
          hmac: StringConversion.arrayBufferToHexString(hmac),
          ciphertext: ciphertextB64,
          IV: StringConversion.uint8ArrayToBase64String(IV)
        };
      });
    });
  };

  /*
   * encrypt - encrypt and sign a record
   *
   * @param {Object} record Object The data to be JSON-stringified and stored
   * @param {String} collectionName String The name of the Sync collection
   *     (currently ignored, see
   *     https://github.com/michielbdejong/fxsync-webcrypto/issues/19)
   * @returns {Promise} A promise for an object with ciphertext, IV, and hmac.
   */
  const encrypt = function(record, collectionName) {
    if (typeof record !== 'object') {
      return Promise.reject(new Error('Record should be an object (1015)'));
    }
    if (typeof collectionName !== 'string') {
      return Promise.reject(new Error('collectionName is not a string (1016)'));
    }

    var cleartextStr, keyBundle;

    try {
      cleartextStr = JSON.stringify(record);
    } catch(e) {
      return Promise.reject(new Error(`Record cannot be JSON-stringified (1017\
)`));
    }
    const cleartext = StringConversion.stringToUtf8Uint8Array(cleartextStr);
    try {
      keyBundle = this.bulkKeyBundle.defaultAsKeyBundle;
    } catch(e) {
      return Promise.reject(new Error(`No key bundle found for \
${collectionName} - did you call setKeys? (1018)`));
    }
    return encryptAndSign(keyBundle, cleartext);
  };

  const FxSyncWebCrypto = function() {
    // Basic check for presence of WebCrypto.
    if (!crypto || !crypto.subtle) {
      throw new Error('This environment does not support WebCrypto (1019)');
    }

    this.bulkKeyBundle = null;
  };

  FxSyncWebCrypto.prototype = Object.freeze({
    setKeys: setKeys,
    decrypt: decrypt,
    encrypt: encrypt
  });

  // Expose this for unit test:
  FxSyncWebCrypto.importKeyBundle = Object.freeze(importKeyBundle);

  return FxSyncWebCrypto;
})());
