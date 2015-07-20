/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* exported WeaveCrypto */

'use strict';

(function(exports) {
  var WeaveCrypto = {
    _eventCount: 0,

    _deferred: {},

    onChromeEvent: function(event) {
      var message = event.detail;
      if (!message.id) {
        return;
      }

      var deferred = this._deferred[message.id];
      if (!deferred) {
        console.error('Unexpected missing promise');
        return;
      }

      if (message.error) {
        deferred.reject(message.error);
        return;
      }

      deferred.resolve(message.result);

      this._eventCount--;
      if (!this._eventCount) {
        window.removeEventListener('mozWeaveCryptoChromeEvent',
                                   this.onChromeEvent);
      }
    },

    dispatchContentEvent: function(details) {
      var event = document.createEvent('CustomEvent');
      event.initCustomEvent('mozWeaveCryptoContentEvent', true, true, details);
      window.dispatchEvent(event);
    },

    getUUID: function() {
      var s4 = function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
                   .toString(16)
                   .substring(1);
      };
      return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
             s4() + '-' + s4() + s4() + s4();
    },

    sendMessage: function(message) {
      var deferred = {};
      var id = this.getUUID();
      deferred.promise = new Promise((resolve, reject) => {
        deferred.resolve = resolve;
        deferred.reject = reject;
      });

      if (!this._eventCount) {
        window.addEventListener('mozWeaveCryptoChromeEvent',
                                this.onChromeEvent.bind(this));
      }

      this._deferred[id] = deferred;

      var detail = {
        id: id,
        data: message
      };

      this.dispatchContentEvent(detail);

      this._eventCount++;

      return deferred.promise;
    },

    // === API ===

    encrypt: function(clearText, symmetricKey, iv) {
      if (!clearText || !symmetricKey || !iv) {
        return Promise.reject('Missing parameter');
      }

      return this.sendMessage({
        method: 'encrypt',
        clearText: clearText,
        symmetricKey: symmetricKey,
        iv: iv
      });
    },

    decrypt: function(cypherText, symmetricKey, iv) {
      if (!cypherText || !symmetricKey || !iv) {
        return Promise.reject('Missing parameter');
      }

      return this.sendMessage({
        method: 'decrypt',
        cypherText: cypherText,
        symmetricKey: symmetricKey,
        iv: iv
      });
    },

    generateRandomIV: function() {
      return this.sendMessage({
        method: 'generateRandomIV'
      });
    }
  };

  exports.WeaveCrypto = WeaveCrypto;

}(window));
