/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

/* global
  StringConversion
*/

/* exported
  KeyDerivation
*/

const KeyDerivation = Object.freeze((() => {
  // Hash length is 32 because only SHA256 is used at this moment.
  const HASH_LENGTH = 32;
  const subtle = window.crypto.subtle;

  const concatU8Array = (buffer1, buffer2) => {
    var aux = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
    aux.set(new Uint8Array(buffer1), 0);
    aux.set(new Uint8Array(buffer2), buffer1.byteLength);
    return aux;
  };

  const alg = {
    name: 'HMAC',
    hash: 'SHA-256'
  };

  const doImportKey = (rawKey) => {
    return subtle.importKey('raw', rawKey, alg, false, ['sign']);
  };

  // Converts a ArrayBuffer into a ArrayBufferView (U8) if it's not that
  // already.
  const arrayBuffer2Uint8 = (buff) => {
    return buff.buffer && buff || new Uint8Array(buff);
  };

  const doHMAC = (tbsData, hmacKey) => {
    return subtle.sign(alg.name, hmacKey, tbsData).then(arrayBuffer2Uint8);
  };

  const bitSlice = (arr, start, end) => {
    return (end !== undefined ? arr.subarray(start / 8, end / 8) :
                                arr.subarray(start / 8));
  };

  const newEmptyArray = () => new Uint8Array(0);

  return {
    /**
     * hkdf - The HMAC-based Key Derivation Function
     *
     * @param {bitArray} ikm Initial keying material
     * @param {bitArray} info Key derivation data
     * @param {bitArray} salt Salt
     * @param {integer} length Length of the derived key in bytes
     * @return promise object- It will resolve with `output` data
     */
    hkdf: (ikm, info, salt, length) => {
      const numBlocks = Math.ceil(length / HASH_LENGTH);

      const doHKDFRound = (roundNumber, prevDigest, prevOutput, hkdfKey) => {
        // Do the data accumulating part of an HKDF round. Also, it
        // checks if there are still more rounds left and fires the next
        // Or just finishes the process calling the callback.
        const addToOutput = (digest) => {
          const output = prevOutput +
              StringConversion.uint8ArrayToHexString(digest);

          if (++roundNumber <= numBlocks) {
            return doHKDFRound(roundNumber, digest, output, hkdfKey);
          }
          return new Promise(resolve => {
            const truncated = bitSlice(
                StringConversion.hexStringToUint8Array(output), 0, length * 8);
            resolve(truncated);
          });
        };
        const input = concatU8Array(
          concatU8Array(prevDigest, info),
          StringConversion.stringToUtf8Uint8Array(
               String.fromCharCode(roundNumber)));
        return doHMAC(input, hkdfKey).then(addToOutput);
      };

      return doImportKey(salt). // Imports the initial key.
        then(doHMAC.bind(undefined, ikm)). // Generates the key deriving key.
        then(doImportKey). // Imports the key deriving key.
        then(doHKDFRound.bind(undefined, 1, newEmptyArray(), ''));
      // Launches the first HKDF round.
    }
  };
})());
