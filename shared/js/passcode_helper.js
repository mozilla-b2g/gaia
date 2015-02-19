/* exported PasscodeHelper */
/* globals crypto, TextEncoder */
(function(exports) {
  'use strict';

  const SET_DIGEST_VALUE = 'lockscreen.passcode-lock.digest.value';
  const SET_DIGEST_SALT = 'lockscreen.passcode-lock.digest.salt';
  const SET_DIGEST_ITERATIONS = 'lockscreen.passcode-lock.digest.iterations';
  const SET_DIGEST_ALGORITHM = 'lockscreen.passcode-lock.digest.algorithm';
  const DEFAULT_ALGORITHM = 'SHA-1'; //XXX Update to SHA-256 after bug 554827?
  const DEFAULT_ITERATIONS = 1000;
  const PBKDF2_OUTPUT_LENGTH = 160; //XXX HMAC-SHA-1 = 160. Change for SHA-256!

  function _encode(str) {
    return new TextEncoder('utf-8').encode(str);
  }
  function _toTypedArray(obj) {
    // SettingsAPI doesnt like arrays and gives us an Object { 1: .., 2: .. }
    var a = [];
    for (var key of Object.keys(obj)) {
      a.push(obj[key]);
    }
    return new Uint8Array(a);
  }
  function _deriveBits(pwKey, salt, iterations, algorithm) {
    var params = {
      name: 'PBKDF2',
      hash: algorithm,
      salt: salt,
      iterations: iterations
    };
    return crypto.subtle.deriveBits(params, pwKey, PBKDF2_OUTPUT_LENGTH);
  }

  function _makeDigest(pass, salt, iterations, algorithm) {
    var bytes = _encode(pass);
    var promise = crypto.subtle.importKey('raw', bytes, 'PBKDF2', false,
                                          ['deriveBits']);
    promise = promise.then((pwKey) => {
      return _deriveBits(pwKey, salt, iterations, algorithm);
    });
    promise = promise.catch((error) => {
      console.error('PasscodeHelper: _derive_bits() failed!', error);
      throw error;
    });
    return promise;
  }

  function setPasscode(newPass) {
    // Always generate a new salt.
    var salt = crypto.getRandomValues(new Uint8Array(8));
    /* the combined lock.get() makes it quite ugly. we get
     an Array of objects, each with just one key/value,
     which is the requested setting. let's destruct as follows:
     */
    var promise = _makeDigest(newPass, salt, DEFAULT_ITERATIONS,
                              DEFAULT_ALGORITHM);
    promise = promise.then((digest) => {
      return _storeNewPasscode(digest, salt);
    });
    promise = promise.catch((error) => {
      console.error('PasscodeHelper: Could not make digest:', error);
      throw error;
    });
    return promise;
  }
  function _storeNewPasscode(digest, salt) {
    // Note: We can now store the salt, since digest was generated!
    var digestUint8 = new Uint8Array(digest);
    var newSettings = {
      [SET_DIGEST_SALT]: salt,
      [SET_DIGEST_VALUE]: digestUint8,
      [SET_DIGEST_ITERATIONS]: DEFAULT_ITERATIONS,
      [SET_DIGEST_ALGORITHM]: DEFAULT_ALGORITHM,
    };
    var lock = navigator.mozSettings.createLock();
    var req = lock.set(newSettings);
    return req.then(() => {
      return digestUint8;
    }, (error) => {
      console.error('PasscodeHelper: Couldnt store new digest', error);
      throw error;
    });
  }
  function checkPasscode(testPass) {
    //get salt & digest out of settings
    var lock = navigator.mozSettings.createLock();
    var storedParams = Promise.all([
      lock.get(SET_DIGEST_SALT),
      lock.get(SET_DIGEST_ITERATIONS),
      lock.get(SET_DIGEST_ALGORITHM),
      lock.get(SET_DIGEST_VALUE)
    ]);
    return storedParams.then((values) => {
      return _makeAndCompare(...values, testPass);
    })
      .catch((error) => {
        console.error('PasscodeHelper: Couldnt get digest Settings:', error);
        throw error;
      });
  }
  function _makeAndCompare(salt, iterations, algorithm, storedDigest,
                           testPass) {
    /* the combined lock.get() makes it quite ugly. we get
     an Array of objects, each with just one key/value,
     which is the requested setting. let's destruct as follows:
     */
    var _salt = _toTypedArray(salt[SET_DIGEST_SALT]);
    var _iterations = iterations[SET_DIGEST_ITERATIONS];
    var _algorithm = algorithm[SET_DIGEST_ALGORITHM];
    var _storedDigest = _toTypedArray(storedDigest[SET_DIGEST_VALUE]);
    var promise = _makeDigest(testPass, _salt, _iterations, _algorithm);
    promise = promise.then((digest)  => {
      var typedDigest = new Uint8Array(digest);
      return _compareDigests(_storedDigest, typedDigest);
    });
    promise = promise.catch((error) => {
      console.error('PasscodeHelper: Couldnt create digest', error);
      throw error;
    });
    return promise;
  }
  function _compareDigests(buf1, buf2) {
    if (buf1.byteLength !== buf2.byteLength) {
      return false;
    }
    for (var i = 0; i < buf1.byteLength; i++) {
      if (buf1[i] !== buf2[i]) {
        return false;
      }
    }
    return true;
  }
  exports.PasscodeHelper =  {
    set: setPasscode,
    check: checkPasscode
  };
})(this);
