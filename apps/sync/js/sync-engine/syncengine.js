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
  var createFxSyncIdSchema = () => {
    return {
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
        // FxSync id's "should" be 12 ASCII characters, representing 9 bytes of
        // data in modified Base64 for URL variants, where the '+' and '/'
        // characters of standard Base64 are respectively replaced by '-' and
        // '_'. See https://docs.services.mozilla.com/storage/apis-1.5.html
        // But in practice, they could be any string, see bug 1209906.
        return (typeof id === 'string');
      }
    };
  };

  var createControlCollectionIdSchema = (keyName) => {
    return {
      generate: function() {
        return keyName;
      },
      validate: function(id) {
        return (id === keyName);
      }
    };
  };

  var createWebCryptoTransformer = (collectionName, fswc) => {
    if (!fswc.bulkKeyBundle) {
      throw new Error(
          'Attempt to register Transformer with no bulk key bundle!');
    }
    return {
      encode: function(record) {
        return fswc.encrypt(record.payload, collectionName).then(
            payloadEnc => {
          return {
            id: record.id,
            payload: JSON.stringify(payloadEnc)
          };
        });
      },
      decode: function(record) {
        // Allowing JSON.parse errors to bubble up to the errors list in the
        // syncResults:
        return fswc.decrypt(JSON.parse(record.payload), collectionName).
            then(payloadDec => {
          return {
            id: record.id,
            last_modified: record.last_modified,
            payload: payloadDec
          };
        });
      }
    };
  };

  const generateXClientState = (kB) => {
    var kBarray = [];
    for(var i = 0; i < kB.length; i += 2){
      kBarray.push(parseInt(kB.substring(i, i + 2), 16));
    }
    return window.crypto.subtle.digest({name: 'SHA-256'},
                                       new Uint8Array(kBarray))
    .then(hash => {
      var bytes = new Uint8Array(hash).slice(0, 16);
      var array = [];
      bytes.forEach(byte => {
        array.push((byte < 16 ? '0' : '') + byte.toString(16).toLowerCase());
      });
      return array.join('');
    });
  };

  /**
    * SyncEngine - Constructor.
    * @param {Object} options Should contain the following fields:
    *                         * URL - e.g. 'http://localhost:8000/v1/'
    *                         * assertion - a BrowserID assertion (Base64)
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
    ['URL', 'assertion', 'kB'].forEach(field => {
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

    ['kB', 'assertion', 'URL', 'adapters'].forEach(field => {
      this[`_${field}`] = options[field];
    });

    this._collections = {};
    this._controlCollections = {};
    this._fswc = new FxSyncWebCrypto();
    this._kinto = null;
    this._xClientState = null;
    this._haveUnsyncedConflicts = {};
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
        var idSchema = createControlCollectionIdSchema(keyName);
        this._controlCollections[collectionName] =
            kinto.collection(collectionName, { idSchema });
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

    _getItem: function(collectionName, itemName, syncIfNeeded) {
      return this._getCollection(collectionName).get(itemName).catch(err => {
        if (syncIfNeeded) {
          return this._syncCollection(collectionName).then(() => {
            return this._getItem(collectionName, itemName, false);
          });
        }
        if (err.message === 'Record with id=global not found.') {
          throw new SyncEngine.InvalidAccountError();
        }
        throw err;
      });
    },

    _resolveConflicts: function(collectionName, conflicts) {
      return Promise.all(conflicts.map(conflict => {
        return this._adapters[collectionName].handleConflict(conflict)
          .then(resolution =>
              this._collections[collectionName].resolve(conflict, resolution))
          .then(() => this._haveUnsyncedConflicts[collectionName] = true);
      }));
    },

    _syncCollection: function(collectionName) {
      var collection = this._getCollection(collectionName);
      // Let synchronization strategy default to 'manual', see
      // http://kintojs.readthedocs.org \
      //     /en/latest/api/#fetching-and-publishing-changes

      return collection.sync().then(syncResults => {
        if (syncResults.ok) {
          return syncResults;
        }
        return Promise.reject(new SyncEngine.UnrecoverableError('SyncResults',
            collectionName, syncResults));
      }).then(syncResults => {
        if (syncResults.conflicts.length) {
          return this._resolveConflicts(collectionName, syncResults.conflicts);
        }
      }).catch(err => {
        if (err instanceof TypeError) {
          // FIXME: document in which case Kinto.js throws a TypeError
          throw new SyncEngine.UnrecoverableError(err);
        } else if (err instanceof Error && typeof err.response === 'object') {
          if (err.response.status === 401) {
            throw new SyncEngine.AuthError(err);
          }
          throw new SyncEngine.TryLaterError(err);
        } else if (err.message === `HTTP 0; TypeError: NetworkError when attemp\
ting to fetch resource.`) {
          throw new SyncEngine.TryLaterError('Syncto server unreachable',
              this._kinto && this._kinto._options &&
              this._kinto._options.remote);
        }
        throw new SyncEngine.UnrecoverableError(err);
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
          throw new SyncEngine.UnrecoverableError(err);
        }
        throw err;
      });
    },

    _ensureReady: function() {
      if (this._ready) {
        return Promise.resolve();
      }
      return generateXClientState(this._kB).then(xClientState => {
        this._kinto = this._createKinto({
           URL: this._URL,
           assertion: this._assertion,
           xClientState
         });
         this._xClientState = xClientState;
      }).then(() => {
        return this._syncCollection('meta');
      }).then(() => {
        return this._getItem('meta', 'global');
      }).then(metaGlobal => {
        if (!this._storageVersionOK(metaGlobal)) {
          return Promise.reject(new SyncEngine.UnrecoverableError(`Incompatible\
 storage version or storage version not recognized.`));
        }
        return this._getItem('crypto', 'keys', true /* syncIfNeeded */);
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
            collectionName, {
              idSchema: createFxSyncIdSchema(collectionName),
              remoteTransformers: [
                createWebCryptoTransformer(collectionName, this._fswc)
              ]
            });
      }
    },

    _updateCollection: function(collectionName, collectionOptions) {
      return this._syncCollection(collectionName).then(() => {
        return this._adapters[collectionName].update(
            this._collections[collectionName], collectionOptions);
      }).then(changed => {
        if (!changed && !this._haveUnsyncedConflicts[collectionName]) {
          return Promise.resolve();
        }
        return this._syncCollection(collectionName).then(() => {
          this._haveUnsyncedConflicts[collectionName] = false;
        });
      });
    },

    /**
      * syncNow - Syncs collections up and down between device and server.
      * @param {object} collectionOptions The options per collection. Currently,
      *                                   only readonly (defaults to true).
      * @returns {Promise}
      */
    syncNow: function(collectionOptions) {
      if (typeof collectionOptions !== 'object') {
        return Promise.reject(new Error(
            'collectionOptions should be an object'));
      }
      return this._ensureReady().then(() => {
        var promises = [];
        for (var collectionName in collectionOptions) {
          collectionOptions[collectionName].userid = this._xClientState;
          promises.push(this._updateCollection(collectionName,
               collectionOptions[collectionName]));
        }
        return Promise.all(promises);
      });
    }
  };

  SyncEngine.UnrecoverableError = function() {
    console.error('[SyncEngine Unrecoverable]', arguments);
    this.message = 'unrecoverable';
  };
  SyncEngine.UnrecoverableError.prototype = Object.create(Error.prototype);

  SyncEngine.TryLaterError = function() {
    console.error('[SyncEngine TryLater]', arguments);
    this.message = 'try later';
  };
  SyncEngine.TryLaterError.prototype = Object.create(Error.prototype);

  SyncEngine.AuthError = function() {
    console.error('[SyncEngine Auth]', arguments);
    this.message = 'unauthorized';
  };
  SyncEngine.AuthError.prototype = Object.create(Error.prototype);

  SyncEngine.InvalidAccountError = function() {
    console.error('[SyncEngine InvalidAccount]', arguments);
    this.message = 'invalid account';
  };
  SyncEngine.InvalidAccountError.prototype = Object.create(Error.prototype);

  return SyncEngine;
})();
