/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

'use strict';

/* exported
  FxSyncWebCryptoFixture
*/

const FxSyncWebCryptoFixture = (() => {
  // NB: This data is from an FxSync account, freshly created for this purpose,
  // and then synced once using FxDesktop with a fresh empty Firefox profile:

  const hex2ba = (hexStr) => {
    var numBytes = hexStr.length / 2;
    var byteArray = new Uint8Array(numBytes);
    for (var i = 0; i < numBytes; i++) {
      byteArray[i] = parseInt(hexStr.substr(i * 2, 2), 16);
    }
    return byteArray;
  };

  return {
    kB: '85c4f8c1d8e3e2186824c127af786891dd03c6e05b1b45f28f7181211bf2affb',
    hkdf: {
      kB: hex2ba(`85c4f8c1d8e3e2186824c127af786891dd03c6e05b1b45f28f7181211bf2a\
ffb`),
      infoStr: hex2ba(
          `6964656e746974792e6d6f7a696c6c612e636f6d2f7069636c2f76312f6f6c647379\
6e63`), // 'identity.mozilla.com/picl/v1/oldsync'
      outputHex: `d63eb2610f1e5edc21b37fed22b93b0f9ea379840fb5c3c5eb95991b9b3bf\
ab69cbabfda0762bdf0b27431d81960c8cf5dab7d482901213a5a1b003eb0081ed0`
    },
    cryptoKeys: {
      ciphertext: `PP5yNUYwJJoLcsL5o85i6RZfvanYDrwtChDD/LdKTZ8JOLubZ9DyRv3HMetS\
kbhL3HLvVm/FJ1Z4F2Z6IKQCxAc5dNnLsBIUUxhOHLbT0x9/jfnqZ8fLtlbkogI3ZlNvbc8iUF1aX+b\
oe0Pv43vM0VvzxrnJDYzZ2a6jm9nbzUn0ldV9sv6vuvGHE6dANnRkZ3wA/q0q8UvjdwpzXBixAw==`,
      IV: 'FmosM+XBNy81/9oEAgI4Uw==',
      hmac: '01a816e4577c6cf3f97b66b4382d0a3e7e9178c75a3d38ed9ac8ad6397c2ecce'
    },
    historyEntryEnc: {
      payload: {
        ciphertext: `o6aTLJdfhW4nz1hhnE2ZkvPb9N9lP6JEez+oufMGWIVAgQFaEMB3r/Oboc\
vRti2dwe7yo2qly9d8aILHuOTgerFZuC5Bu5b0KmvHnVBzLxcPcqF20mFY2iQIApEI82Cu2VfwZuX4t\
nCLMlxfllEzWvQPWai8e5OKmThdzKdHAmaS+sHBj5FjTe5mxuX4U1c8EJUS3a4fSV5NY0EolUkSuMLw\
9sXu++7Uiu8OJH/JNWis6getxKcE+J61iaHJO/raiPyYIB/tSi3yrIjb0FqLeG8tXCrrZ9VD/2AWPmJ\
5/6bpt80dSXgke4qvKePNoCYp`,
        IV: 'pP/NMhj5fwREqes4I9H0tw==',
        hmac: '97d16085c1bf347cb7530342ccf85647609be4a8f55d2b8fe409b1756240c06b'
      },
      collectionName: 'history'
    },
    historyEntryDec: {
      payload: {
        id: '_9sCUbahs0ay',
        histUri: `https://developer.mozilla.org/en-US/docs/Web/JavaScript/Refer\
ence/Global_Objects/Object/proto`,
        title: 'Object.prototype.__proto__ € - JavaScript | MDN',
        visits:[ { date: 1439366063808983, type:1 } ]
      },
      collectionName: 'history'
    }
  };
})();
