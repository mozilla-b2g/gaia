/* global enumerateAll, Promise */
'use strict';

window.sdCardRingtones = (function() {
  var ID_PREFIX = 'sdcard:';
  var BASE_DIRS = {
    'ringtone': 'Ringtones',
    'alerttone': 'Notifications'
  };

  /**
   * Given a path to an SD card tone, return its type ("ringtone" or
   * "alerttone").
   *
   * @param {String} path The path to the tone.
   * @return {String} The tone's type.
   */
  function pathToType(path) {
    // Get the name of the folder the tone is stored in. We're looking for
    // either "/volume-name/Folder/" or "Folder/". We can guarantee that the
    // regex matches, or something horrible has happened, in which case we'll
    // throw an exception automatically.
    var folder = new RegExp('^(/[^/]*/)?([^/]*)/').exec(path)[2];
    for (var type in BASE_DIRS) {
      if (BASE_DIRS[type] === folder) {
        return type;
      }
    }

    // This should never happen.
    throw new Error('unexpected SD card folder: ' + folder);
  }

  /**
   * Create a new SD card ringtone object.
   *
   * @param {File} file A File object for the ringtone.
   */
  function SDCardRingtone(file) {
    var leafname = file.name.substr(file.name.lastIndexOf('/') + 1);
    this._name = leafname.replace(/\.\w+$/, '');
    this._blob = file;
    this._type = pathToType(this._blob.name);
  }

  SDCardRingtone.prototype = {
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
      return this._blob.name;
    },

    /**
     * @return {String} The subtitle of the ringtone (always "SD Card" in this
     *   case).
     */
    get subtitle() {
      return navigator.mozL10n.get('sd-card-subtitle');
    },

    /**
     * @return {String} A unique ID for the ringtone.
     */
    get id() {
      return ID_PREFIX + this._blob.name;
    },

    /**
     * @return {String} The type of the tone. Either "ringtone" or "alerttone".
     */
    get type() {
      return this._type;
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
   * Convert an SDCardRingtone ID to its corresponding filename.
   *
   * @param {String} id The ID.
   * @return {Number} The filename.
   */
  function idToFilename(id) {
    return id.substr(ID_PREFIX.length);
  }

  var defaultStorage = navigator.getDeviceStorage('music');

  function remove(id) {
    return new Promise(function(resolve, reject) {
      var request = defaultStorage.delete(idToFilename(id));
      request.onsuccess = function() {
        resolve();
      };
      request.onerror = function() {
        console.error('Error in sdCardRingtones.remove(): ', this.error);
        reject(this.error);
      };
    });
  }

  function get(id) {
    return new Promise(function(resolve, reject) {
      var request = defaultStorage.get(idToFilename(id));
      request.onsuccess = function() {
        resolve(new SDCardRingtone(this.result));
      };
      request.onerror = function() {
        console.error('Error in sdCardRingtones.get(): ', this.error);
        reject(this.error);
      };
    });
  }

  function list(toneType) {
    if (!(toneType in BASE_DIRS)) {
      throw new Error('tone type not supported: ' + toneType);
    }

    return new Promise(function(resolve, reject) {
      var results = [];
      var sdcards = navigator.getDeviceStorages('music');
      var cursor = enumerateAll(sdcards, BASE_DIRS[toneType]);
      cursor.onsuccess = function() {
        var file = this.result;
        if (file) {
          if (file.name[0] !== '.' && file.name.indexOf('/.') === -1) {
            results.push(new SDCardRingtone(file));
          }
          this.continue();
        } else {
          resolve(results);
        }
      };
      cursor.onerror = function() {
        if (this.error.name === 'NotFoundError' ||
            this.error.name === 'TypeMismatchError') {
          resolve([]);
        } else {
          console.error('Error in sdCardRingtones.list(): ', this.error);
          reject(this.error);
        }
      };
    });
  }

  return {
    remove: remove,
    get: get,
    list: list
  };
})();
