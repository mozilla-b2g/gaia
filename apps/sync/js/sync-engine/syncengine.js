/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * SyncEngine
 *
 * The SyncEngine constructor takes care of:
 * - Setting up the kinto.js client.
 * - Configuring kinto.js to connect to the remote Syncto server (which in turn
 *   proxies all requests to the remote Firefox Sync server).
 * - Creating kinto.js collections for the 'meta' and 'crypto' collections, with
 *   the appropriate IdSchemas (the 'meta' collection only contains one record,
 *   called 'global', and the 'crypto' collection only contains one record,
 *   called 'keys').
 * - Setting up the FxSyncWebCrypto instance to be used for cryptographically
 *   encoding / decoding records, before uploading / after downloading them.
 * - Registering the DataAdapters to be used on each collection (see below).
 *
 * The `syncNow` method takes care of:
 * - If called for the first time, or if this failed the previous time:
 *   - Retrieving 'meta/global' to check the storageVersion.
 *   - Retrieving and decrypting 'crypto/keys' to obtain the bulk key bundle.
 * - Making sure a kinto.js collection exists for each collection that needs
 *   syncing.
 * - These collections are set up with the correct IdSchema (typically
 *   allowing only 9-character URL-safe Base64 strings, although for some
 *   collections other strings are allowed, e.g. bookmarks also has id's like
 *   'menu' and 'toolbar').
 * - Adding a RemoteTransformer to each of these collections, so that outgoing
 *   and incoming data is passed through FxSyncWebCrypto for its en-/decryption.
 * - For each collection to be synced, the following steps occur:
 *   - Download the latest remote data into the local decrypted copy, managed by
 *     kinto.js.
 *   - For each incoming conflict reported by kinto.js (if any), call the
 *     `handleConflict` method on the DataAdapter registered for this
 *     collection.
 *   - When kinto.js has obtained a full decrypted copy of the remote data, call
 *     the `update` method on the DataAdapter, passing it an interface to the
 *     Kinto collection in question.
 *   - When this method returns its promise, sync the Kinto collection a second
 *     time, to make sure any changes made there by the DataAdapter are synced
 *     up to the remote Firefox Sync server (again, through the remote Syncto
 *     proxy server). The RemoteTransformer on the Kinto collection will take
 *     care of encrypting the records before they get uploaded.
 *   - Call the `handleConflict` method on the DataAdapter again for any
 *     conflicts kinto.js may report during this second sync process.
 *
 */

'use strict';

/* global
  crypto,
  FxSyncWebCrypto,
  Kinto
*/

/* exported
  SyncEngine
*/

var SyncEngine = (function() {
  var FxSyncIdSchema = Kinto.createIdSchema({
    constructor: function(collectionName) {
      this.collectionName = collectionName;
    },
    generate: function() {
      var bytes = new Uint8Array(9);
      crypto.getRandomValues(bytes);
      var binStr = '';
      for (var i = 0; i < 9; i++) {
          binStr += String.fromCharCode(bytes[i]);
      }
      // See https://docs.services.mozilla.com/storage/apis-1.5.html
      return window.btoa(binStr).replace('+', '-').replace('/', '_');
    },
    validate: function(id) {
      // FxSync id's should be 12 ASCII characters, representing 9 bytes of data
      // in modified Base64 for URL variants exist, where the '+' and '/'
      // characters of standard Base64 are respectively replaced by '-' and '_'
      // See https://docs.services.mozilla.com/storage/apis-1.5.html
      return /^[A-Za-z0-9-_]{12}$/.test(id);
    }
  });

  var ControlCollectionIdSchema = Kinto.createIdSchema({
    constructor: function(collectionName, keyName) {
      this.collectionName = collectionName;
      this.keyName = keyName;
    },
    generate: function() {
      return this.keyName;
    },
    validate: function(id) {
      return (id === this.keyName);
    }
  });

  var WebCryptoTransformer = Kinto.createRemoteTransformer({
    constructor: function(collectionName, fswc) {
      if (!fswc.bulkKeyBundle) {
        throw new Error(`Attempt to register Transformer with no bulk key bundl\
e!`);
      }
      this.collectionName = collectionName;
      this.fswc = fswc;
    },
    encode: function(record) {
      return this.fswc.encrypt(record.payload, this.collectionName).then(
          payloadEnc => {
        record.payload = JSON.stringify(payloadEnc);
        return record;
      });
    },
    decode: function(record) {
      // Allowing JSON.parse errors to bubble up to the errors list in the
      // syncResults:
      return this.fswc.decrypt(JSON.parse(record.payload), this.collectionName).
          then(payloadDec => {
        record.payload = payloadDec;
        return record;
      });
    }
  });

  /**
    * SyncEngine - Constructor.
    * @param {Object} options Should contain the following fields:
    *                         * URL - e.g. 'http://localhost:8000/v1/'
    *                         * assertion - a BrowserID assertion (Base64)
    *                         * xClientState - xClientState header value
    *                         * kB - kB key from token server (Base64)
    *                         * adapters - object whose keys are collection
    *                                      names, and whose values are
    *                                      DataAdapter instances.
    * @returns {SyncEngine}
    */
  var SyncEngine = function(options) {
    if (typeof options !== 'object') {
      throw new Error('options should be an Object');
    }
    ['URL', 'assertion', 'xClientState', 'kB'].forEach(field => {
      if (typeof options[field] !== 'string') {
        throw new Error(`options.${field} should be a String`);
      }
    });
    if (typeof options.adapters !== 'object') {
      throw new Error('options.adapters should be an Object');
    }
    for (var collectionName in options.adapters) {
      if (typeof options.adapters[collectionName] !== 'object') {
        throw new Error(`options.adapters.${collectionName} should be an Object\
`);
      }
      ['update', 'handleConflict'].forEach(methodName => {
        if (typeof options.adapters[collectionName][methodName] !==
            'function') {
          throw new Error(`options.adapters.${collectionName}.${methodName} sho\
uld be a Function`);
        }
      });
    }

    this._kB = options.kB;
    this._collections = {};
    this._controlCollections = {};
    this._fswc = new FxSyncWebCrypto();
    this._kinto = this._createKinto({
       URL: options.URL,
       assertion: options.assertion,
       xClientState: options.xClientState
    });
    this._adapters = options.adapters;
    this._ready = false;
  };

  SyncEngine.prototype = {
    _createKinto: function(kintoCredentials) {
      var kinto = new Kinto({
        bucket: 'syncto',
        dbPrefix: kintoCredentials.xClientState,
        remote: kintoCredentials.URL,
        headers: {
          'Authorization': 'BrowserID ' + kintoCredentials.assertion,
          'X-Client-State': kintoCredentials.xClientState
        }
      });
      var addControlCollection = (collectionName, keyName) => {
        this._controlCollections[collectionName] =
            kinto.collection(collectionName);
        this._controlCollections[collectionName].use(
            new ControlCollectionIdSchema(collectionName, keyName));
      };
      addControlCollection('meta', 'global');
      addControlCollection('crypto', 'keys');
      return kinto;
    },

    _getCollection: function(collectionName) {
      if (['meta', 'crypto'].indexOf(collectionName) === -1) {
        return this._collections[collectionName];
      }
      return this._controlCollections[collectionName];
    },

    _getItem: function(collectionName, itemName) {
      return this._getCollection(collectionName).get(itemName);
    },

    _resolveConflicts: function(collectionName, conflicts) {
      return Promise.all(conflicts.map(conflict => {
        var resolution = this._adapters[collectionName].handleConflict(
            conflict);
        return this._collections[collectionName].resolve(conflict, resolution);
      }));
    },

    _syncCollection: function(collectionName) {
      var collection = this._getCollection(collectionName);
      // Let synchronization strategy default to 'manual', see
      // http://kintojs.readthedocs.org \
      //     /en/latest/api/#fetching-and-publishing-changes

      return collection.sync().catch(err => {
        throw err;
      }).then(syncResults => {
        if (syncResults.ok) {
          return syncResults;
        }
        return Promise.reject(new SyncEngine.UnrecoverableError());
      }).then(syncResults => {
        if (syncResults.conflicts.length) {
          return this._resolveConflicts(collectionName, syncResults.conflicts);
        }
      }).catch(err => {
        if (err instanceof TypeError) {
          throw new SyncEngine.UnrecoverableError();
        } else if (err instanceof Error && typeof err.request === 'object') {
          if (err.request.status === 401) {
            throw new SyncEngine.AuthError();
          }
          throw new SyncEngine.TryLaterError();
        }
        throw new SyncEngine.UnrecoverableError();
      });
    },

    _storageVersionOK: function(metaGlobal) {
      var payloadObj;
      try {
        payloadObj = JSON.parse(metaGlobal.data.payload);
      } catch(e) {
        return false;
      }
      return (typeof payloadObj === 'object' &&
          payloadObj.storageVersion === 5);
    },

    _initFxSyncWebCrypto: function(cryptoKeys) {
      this._fswc = new FxSyncWebCrypto();
      return this._fswc.setKeys(this._kB, cryptoKeys).then(() => {
        this._createCollections();
        this._ready = true;
      }, err => {
        if (err === 'SyncKeys hmac could not be verified with current main ' +
            'key') {
          throw new SyncEngine.UnrecoverableError();
        }
        throw err;
      });
    },

    _ensureReady: function() {
      if (this._ready) {
        return Promise.resolve();
      }
      return this._syncCollection('meta').then(() => {
        return this._getItem('meta', 'global');
      }).then(metaGlobal => {
        if (!this._storageVersionOK(metaGlobal)) {
          return Promise.reject(new SyncEngine.UnrecoverableError(`Incompatible\
 storage version or storage version not recognized.`));
        }
        return this._syncCollection('crypto');
      }).then(() => {
        return this._getItem('crypto', 'keys');
      }).then((cryptoKeysRecord) => {
        var cryptoKeys;
        try {
          cryptoKeys = JSON.parse(cryptoKeysRecord.data.payload);
        } catch (e) {
          return Promise.reject(new SyncEngine.UnrecoverableError(`Could not pa\
rse crypto/keys payload as JSON`));
        }
        return cryptoKeys;
      }).then((cryptoKeys) => {
        return this._initFxSyncWebCrypto(cryptoKeys);
      });
    },

    _createCollections: function() {
      for (var collectionName in this._adapters) {
        this._collections[collectionName] = this._kinto.collection(
            collectionName);
        this._collections[collectionName].use(new FxSyncIdSchema(
            collectionName));
        this._collections[collectionName].use(new WebCryptoTransformer(
            collectionName, this._fswc));
      }
    },

    _updateCollection: function(collectionName) {
      return this._syncCollection(collectionName).then(() => {
        return this._adapters[collectionName].update(
            this._collections[collectionName]);
      }).then(() => {
        return this._syncCollection(collectionName);
      });
    },

    /**
      * syncNow - Syncs collections up and down between device and server.
      * @param {Array of Strings} collectionNames The names of the collections
      *                                           to sync.
      * @returns {Promise}
      */
    syncNow: function(collectionNames) {
      if (!Array.isArray(collectionNames)) {
        return Promise.reject(new Error('collectionNames should be an Array'));
      }
      return this._ensureReady().then(() => {
        var promises = [];
        collectionNames.forEach(collectionName => {
          promises.push(this._updateCollection(collectionName));
        });
        return Promise.all(promises);
      });
    }
  };

  SyncEngine.UnrecoverableError = function() {
    this.message = 'unrecoverable';
  };
  SyncEngine.UnrecoverableError.prototype = Object.create(Error.prototype);

  SyncEngine.TryLaterError = function() {
    this.message = 'try later';
  };
  SyncEngine.TryLaterError.prototype = Object.create(Error.prototype);

  SyncEngine.AuthError = function() {
    this.message = 'unauthorized';
  };
  SyncEngine.AuthError.prototype = Object.create(Error.prototype);

  return SyncEngine;
})();
