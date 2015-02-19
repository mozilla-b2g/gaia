/**
 * PassPhrase storage helper.
 * 
 * @module PassPhrase
 * @return {Object}
 */
define([
  'shared/async_storage'
],

function(asyncStorage) {
  'use strict';

  const SALT_NUM_BYTES = 8;

  function PassPhrase(macDest, saltDest) {
    this.macDest = macDest;
    this.saltDest = saltDest;
  }

  PassPhrase.prototype = {
    buffer: encode('topsecret'),

    _getItem: function(key) {
      var promise = new Promise(resolve => {
        asyncStorage.getItem(key, resolve);
      });
      return promise;
    },

    _setItem: function(key, value) {
      var promise = new Promise(resolve => {
        asyncStorage.setItem(key, value, () => resolve(value));
      });
      return promise;
    },

    exists: function() {
      return this._mac().then(mac => !!mac);
    },

    verify: function(password) {
      return this._mac().then(mac => {
        if (!mac) {
          return false;
        }

        return this._retrieveKey(password).then(key => {
          return crypto.subtle.verify('HMAC', key, mac, this.buffer);
        });
      });
    },

    change: function(password) {
      return this._retrieveKey(password).then(key => {
        return crypto.subtle.sign('HMAC', key, this.buffer)
          .then(mac => this._setItem(this.macDest, mac));
      });
    },

    clear: function() {
      return this._setItem(this.macDest, null);
    },

    _mac: function() {
      return this._getItem(this.macDest);
    },

    _salt: function() {
      return this._getItem(this.saltDest).then(salt => {
        if (salt) {
          return salt;
        }
        salt = crypto.getRandomValues(new Uint8Array(SALT_NUM_BYTES));
        return this._setItem(this.saltDest, salt);
      });
    },

    _retrievePWKey: function(password) {
      var usages = ['deriveKey'];
      var buffer = encode(password);
      return crypto.subtle.importKey('raw', buffer, 'PBKDF2', false, usages);
    },

    _retrieveKey: function(password) {
      var params = Promise.all([
        this._retrievePWKey(password), this._salt()
      ]);

      return params.then(values => {
        var pwKey = values[0];
        var salt = values[1];
        return this._deriveKey(pwKey, salt);
      });
    },

    _deriveKey: function(pwKey, salt) {
      var params = {
        name: 'PBKDF2',
        hash: 'SHA-1',
        salt: salt,
        iterations: 5000
      };
      var alg = {name: 'HMAC', hash: 'SHA-256'};
      var usages = ['sign', 'verify'];
      return crypto.subtle.deriveKey(params, pwKey, alg, false, usages);
    }

  };

  function encode(str) {
    return new TextEncoder('utf-8').encode(str);
  }

  return PassPhrase;

});
