/* global IDBKeyRange, indexedDB, Promise */
'use strict';

/*
 * customRingtones is an object that provides access to the user-created
 * ringtones on the device. It has the following methods:
 *
 * add():
 *   Add a new ringtone to the database.
 *
 *   @param {Object} info An object describing the new ringtone. Should contain
 *     the following properties: name, subtitle (optional), and blob.
 *   @return {Promise} A promise returning the created CustomRingtone.
 *
 * remove():
 *   Remove a ringtone from the database.
 *
 *   @param {String} id The ID of the ringtone to delete.
 *   @return {Promise} A promise signalling completion of the removal.
 *
 * clear():
 *   Remove all ringtones from the database. This function is primarily meant
 *   for unit tests.
 *
 *   @return {Promise} A promise signalling completion of the removal.
 *
 * list():
 *   Lists all the custom ringtones.
 *
 *   @param {String} toneType The type of tone to list ('ringtone' or
 *     'alerttone').
 *   @return {Promise} A promise returning an array of CustomRingtones
 *     representing each tone.
 *
 * get():
 *   Gets a ringtone with the specified id.
 *
 *   @param {String} id The ID of the ringtone to get.
 *   @return {Promise} A promise returning the requested ringtone.
 */
window.customRingtones = (function() {
  var ID_PREFIX = 'custom:';

  /**
   * Create a new custom ringtone object.
   *
   * @param {Object} info An object containing info about the ringtone. Contains
   * the following members:
   *   {String} name The name of the tone.
   *   {String} subtitle (optional) The subtitle for the tone (e.g. the artist
   *     of a song).
   *   {Number} uniqueNum The "unique" number for the tone, to disambiguate it
   *     from other tones with the same name and subtitle.
   *   {Boolean} isExplicitNum True if the "unique" number was explicitly
   *     specified in the original name of the tone, false if it was inferred
   *     for de-duplication purposes.
   * @param {Number} dbKey The database key of the tone.
   */
  function CustomRingtone(info, dbKey) {
    this._name = info.name;
    if (info.uniqueNum !== 0 || info.isExplicitNum) {
      this._name += ' (' + info.uniqueNum + ')';
    }
    this._subtitle = info.subtitle || null;
    this._id = ID_PREFIX + dbKey;
    this._blob = info.blob;
  }

  CustomRingtone.prototype = {
    /**
     * @return {String} The name of the ringtone.
     */
    get name() {
      return this._name;
    },

    /**
     * @return {String} The filename of the ringtone.
     */
    get filename() {
      // XXX: If we ever start supporting Blobs that aren't really files, we'll
      // need to figure out a way to make a fallback filename!
      return this._blob.name;
    },

    /**
     * @return {String} The subtitle of the ringtone (e.g. the artist of the
     *   song), or null if there is no subtitle.
     */
    get subtitle() {
      return this._subtitle;
    },

    /**
     * @return {String} A unique ID for the ringtone.
     */
    get id() {
      return this._id;
    },

    /**
     * @return {String} The type of the ringtone. XXX: Currently always
     *   "ringtone".
     */
    get type() {
      return 'ringtone';
    },

    /**
     * @return {String} A URL pointing to the ringtone's audio data.
     */
    get url() {
      // Lazily get the URL for the blob, but once we've done it once, we don't
      // need to use the getter again. XXX: We could be smarter here and have a
      // way of revoking URLs when we're done with them.
      return this._url || (this._url = URL.createObjectURL(this._blob));
    },

    /**
     * @return {Boolean} Whether this ringtone is shareable (always true).
     */
    get shareable() {
      return true;
    },

    /**
     * @return {Boolean} Whether this ringtone is deletable (always true).
     */
    get deletable() {
      return true;
    },

    /**
     * Delete this ringtone from the database.
     *
     * @return A promise returning upon completion of the deletion.
     */
    remove: function() {
      return remove(this.id);
    },

    /**
     * Gets a blob for this ringtone.
     *
     * @return {Promise} A promise returning a Blob of the audio data.
     */
    getBlob: function() {
      return Promise.resolve(this._blob);
    }
  };

  /**
   * Convert a CustomRingtone ID to its corresponding DB key.
   *
   * @param {String} id The ID.
   * @return {Number} The DB key.
   */
  function idToDBKey(id) {
    if (id.indexOf(ID_PREFIX) !== 0) {
      throw new Error('invalid id: ' + id);
    }
    return parseInt(id.substr(ID_PREFIX.length));
  }

  var DBNAME = 'customTones';
  var DBVERSION = 1;
  // Eventually, we'll probably want a separate store for alert tones.
  var STORENAME = 'ringtones';
  var db = null;

  function withStore(type, callback) {
    if (db) {
      var transaction = db.transaction(STORENAME, type);
      callback(
        null, transaction.objectStore(STORENAME), transaction
      );
    } else {
      var openreq = indexedDB.open(DBNAME, DBVERSION);
      openreq.onerror = function() {
        console.error('customRingtones: can\'t open database:',
                      openreq.error.name);
        callback(openreq.error);
      };
      openreq.onupgradeneeded = function() {
        var objStore = openreq.result.createObjectStore(
          STORENAME, { autoIncrement: true }
        );
        objStore.createIndex(
          'fullname', ['name', 'subtitle', 'uniqueNum'], { unique: false }
        );
      };
      openreq.onsuccess = function() {
        db = openreq.result;
        var transaction = db.transaction(STORENAME, type);
        callback(
          null, transaction.objectStore(STORENAME), transaction
        );
      };
    }
  }

  // This function gives us a unique number for our ringtones in case the name
  // and subtitle are the same. We try to be a bit "magical", and if the name
  // we got had an explicit number in parens at the end, we'll try incrementing
  // that number instead of adding a second number. See also the beginning of
  // add() below.
  function uniqueify(info) {
    return new Promise(function(resolve, reject) {
      withStore('readonly', function(err, store) {
        if (err) {
          reject(err);
          return;
        }

        var nextUniqueNum = info.uniqueNum || 0;
        var index = store.index('fullname');

        var req = index.openCursor(
          IDBKeyRange.bound(
            [info.name, info.subtitle, 0],
            [info.name, info.subtitle, Infinity]
          )
        );
        req.onsuccess = function(event) {
          var cursor = event.target.result;
          if (!cursor || nextUniqueNum < cursor.value.uniqueNum) {
            resolve(nextUniqueNum);
            return;
          }
          nextUniqueNum = cursor.value.uniqueNum + 1;
          cursor.continue();
        };
        req.onerror = function() {
          console.error(
            'Error in customRingtones.uniqueify(): ', req.error.name
          );
          reject(req.error);
        };
      });
    });
  }

  function add(info) {
    var cleanedInfo = {
      name: info.name || '',
      subtitle: info.subtitle || '',
      blob: info.blob,
      uniqueNum: 0
    };
    var m = /^(.*) \((\d+)\)$/.exec(cleanedInfo.name);
    if (m) {
      cleanedInfo.name = m[1];
      cleanedInfo.uniqueNum = m[2];
      cleanedInfo.isExplicitNum = true;
    }

    return uniqueify(cleanedInfo).then(function(uniqueNum) {
      return new Promise(function(resolve, reject) {
        withStore('readwrite', function(err, store, transaction) {
          if (err) {
            reject(err);
            return;
          }

          cleanedInfo.uniqueNum = uniqueNum;
          var tone;
          var req = store.add(cleanedInfo);
          req.onsuccess = function(event) {
            tone = new CustomRingtone(cleanedInfo, event.target.result);
          };
          transaction.oncomplete = function(event) {
            resolve(tone);
          };
          transaction.onabort = transaction.onerror = function() {
            console.error('Error in customRingtones.add(): ',
                          transaction.error.name);
            reject(req.error);
          };
        });
      });
    });
  }

  function remove(id) {
    return new Promise(function(resolve, reject) {
      withStore('readwrite', function(err, store, transaction) {
        if (err) {
          reject(err);
          return;
        }

        var req = store.delete(idToDBKey(id));
        transaction.oncomplete = function(event) {
          resolve();
        };
        transaction.onabort = transaction.onerror = function() {
          console.error('Error in customRingtones.remove(): ',
                        transaction.error.name);
          reject(req.error);
        };
      });
    });
  }

  function clear() {
    return new Promise(function(resolve, reject) {
      withStore('readwrite', function(err, store, transaction) {
        if (err) {
          reject(err);
          return;
        }

        var req = store.clear();
        transaction.oncomplete = function(event) {
          resolve();
        };
        transaction.onabort = transaction.onerror = function() {
          console.error('Error in customRingtones.clear(): ',
                        transaction.error.name);
          reject(req.error);
        };
      });
    });
  }

  function get(id) {
    return new Promise(function(resolve, reject) {
      withStore('readonly', function(err, store) {
        if (err) {
          reject(err);
          return;
        }

        var key = idToDBKey(id);
        var req = store.get(key);
        req.onsuccess = function(event) {
          var data = event.target.result;
          if (!data) {
            resolve(null);
          } else {
            resolve(new CustomRingtone(data, key));
          }
        };
        req.onerror = function() {
          console.error('Error in customRingtones.get(): ', req.error.name);
          reject(req.error);
        };
      });
    });
  }

  function list(toneType) {
    return new Promise(function(resolve, reject) {
      // XXX: We should actually handle alert tones eventually!
      if (toneType === 'alerttone') {
        resolve([]);
        return;
      }

      withStore('readonly', function(err, store) {
        if (err) {
          reject(err);
          return;
        }

        var req = store.openCursor();
        var results = [];
        req.onsuccess = function listOnSuccess(event) {
          var cursor = event.target.result;
          if (cursor) {
            var value = cursor.value;
            results.push(new CustomRingtone(value, cursor.key));
            cursor.continue();
          } else {
            resolve(results);
          }
        };
        req.onerror = function listOnError() {
          console.error('Error in customRingtones.list(): ', req.error.name);
          reject(req.error);
        };
      });
    });
  }

  return {
    add: add,
    remove: remove,
    clear: clear,
    get: get,
    list: list
  };
})();
