/* global Promise */
'use strict';

/*
 * builtInRingtones is an object that provides access to the system-provided
 * ringtones on the device. It has the following methods:
 *
 * list():
 *   Lists all the built-in tones of a given type.
 *
 *   @param {String} toneType The type of tone to list ('ringtone' or
 *     'alerttone').
 *   @return {Promise} A promise returning an array of BuiltInRingtones
 *     representing each tone.
 *
 * get():
 *   Gets a tone of the given type and id.
 *
 *   @param {String} id The ID of the tone to get.
 *   @return {Promise} A promise returning the requested BuiltInRingtone.
 *
 * toneTypes:
 *   An array of the valid tone types ('ringtone' and 'alerttone').
 */
window.builtInRingtones = (function() {
  var ID_PREFIX = 'builtin:';
  var BASE_URLS = {
    'ringtone': '/shared/resources/media/ringtones/',
    'alerttone': '/shared/resources/media/notifications/'
  };

  var mimeTypeMap = {
    '.mp3': 'audio/mp3',
    '.mp4': 'audio/mp4',
    '.ogg': 'audio/ogg',
    '.opus': 'audio/ogg'
  };

  /**
   * Try to guess the MIME type of a file based on its extension. It's a shame
   * XHRs don't do this for us automatically!
   *
   * @param {String} filename The filename of the ringtone.
   * @return {String} The MIME type.
   */
  function inferMimeType(filename) {
    var dot = filename.lastIndexOf('.');
    if (dot === -1) {
      console.warn('Couldn\'t infer mimetype for ' + filename);
      return 'application/octet-stream';
    }
    var ext = filename.substr(dot);
    return mimeTypeMap[ext] || 'application/octet-stream';
  }

  /**
   * Create a new built-in ringtone object.
   *
   * @param {String} toneType The kind of tone (ringtone or alerttone).
   * @param {String} filename The filename of the ringtone.
   * @param {Object} toneDef The tone's definition from list.json.
   */
  function BuiltInRingtone(toneType, filename, toneDef) {
    this._toneType = toneType;
    this._filename = filename;
    this._l10nID = toneDef.l10nID;
  }

  BuiltInRingtone.prototype = {
    /**
     * @return {String} The filename without the extension.
     */
    get _rootName() {
      // Strip the file extension for the ID to make it easier to change the
      // file extensions in the future.
      return this._filename.replace(/\.\w+$/, '');
    },

    /**
     * @return {String} The localized name of the tone. Assumes that mozL10n has
     *   been initialized.
     */
    get name() {
      return navigator.mozL10n.get(this.l10nID);
    },

    /**
     * @return {String} The filename of the ringtone.
     */
    get filename() {
      return this._filename;
    },

    /**
     * @return {String} The l10n ID for the tone's name.
     */
    get l10nID() {
      return this._l10nID;
    },

    /**
     * @return {String} A unique ID for the tone.
     */
    get id() {
      return ID_PREFIX + this._toneType + '/' + this._rootName;
    },

    /**
     * @return {String} The type of the tone. Either "ringtone" or "alerttone".
     */
    get type() {
      return this._toneType;
    },

    /**
     * @return {String} A URL pointing to the tone's audio data.
     */
    get url() {
      return BASE_URLS[this._toneType] + this._filename;
    },

    /**
     * @return {Boolean} Whether this ringtone is shareable (always true).
     */
    get shareable() {
      return true;
    },

    /**
     * @return {Boolean} Whether this ringtone is deletable (always false).
     */
    get deletable() {
      return false;
    },

    /**
     * Gets a blob for this tone.
     *
     * @return {Promise} A promise returning a Blob of the audio data.
     */
    getBlob: function() {
      var url = this.url;
      return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url);
        xhr.overrideMimeType(inferMimeType(url));
        xhr.responseType = 'blob';
        xhr.send();
        xhr.onload = function() {
          resolve(xhr.response);
        };
        xhr.onerror = function() {
          var err = new Error('Could not read sound file: ' + url +
                              ' (status: ' + xhr.status + ')');
          console.error(err);
          reject(err);
        };
      });
    }
  };

  /**
   * Get the type of a BuiltInRingtone from its ID.
   *
   * @param {String} id The BuiltInRingtone's ID.
   * @return {String} The tone's type ('ringtone' or 'alerttone').
   */
  function idToToneType(id) {
    var slash = id.indexOf('/');
    if (id.indexOf(ID_PREFIX) !== 0 || slash === -1) {
      throw new Error('invalid id: ' + id);
    }
    return id.substring(ID_PREFIX.length, slash);
  }

  /**
   * Check if a BuiltInRingtone ID refers to a particular filename.
   *
   * @param {String} id The BuiltInRingtone's ID.
   * @param {String} toneType The type of the tone held in `filename`.
   * @param {String} filename The filename.
   * @return {Boolean} True if the id and filename match, false otherwise.
   */
  function idMatchesFilename(id, toneType, filename) {
    return id === ID_PREFIX + toneType + '/' + filename.replace(/\.\w+$/, '');
  }

  // Our cache of tone definitions from the list.json files.
  var toneDefsCache = {};

  /**
   * Read the list.json file to get the names of all sounds we know about.
   * This function caches its results so that subsequent calls are speedy.
   *
   * @param {String} toneType The type of tones to get ('ringtone' or
   *   'alerttone').
   * @return {Promise} A promise returning an array of filenames.
   */
  function getSoundFilenames(toneType) {
    if (!(toneType in BASE_URLS)) {
      throw new Error('tone type not supported: ' + toneType);
    }

    return new Promise(function(resolve, reject) {
      if (toneType in toneDefsCache) {
        resolve(toneDefsCache[toneType]);
        return;
      }

      var xhr = new XMLHttpRequest();
      xhr.open('GET', BASE_URLS[toneType] + 'list.json');
      xhr.responseType = 'json';
      xhr.send(null);

      xhr.onload = function() {
        toneDefsCache[toneType] = xhr.response;
        resolve(xhr.response);
      };

      xhr.onerror = function() {
        var err = new Error('Could not read sounds list for ' + toneType +
                            ' (status: ' + xhr.status + ')');
        console.error(err);
        reject(err);
      };
    });
  }

  function list(toneType) {
    return getSoundFilenames(toneType).then(function(toneDefs) {
      var tones = [];
      for (var filename in toneDefs) {
        tones.push(new BuiltInRingtone(toneType, filename, toneDefs[filename]));
      }
      return tones;
    });
  }

  function get(id) {
    return new Promise(function(resolve, reject) {
      var toneType = idToToneType(id);
      resolve(getSoundFilenames(toneType).then(function(toneDefs) {
        for (var filename in toneDefs) {
          if (idMatchesFilename(id, toneType, filename)) {
            return new BuiltInRingtone(toneType, filename, toneDefs[filename]);
          }
        }
        var err = new Error('No ' + toneType + ' found with id = ' + id);
        console.error(err);
        throw err;
      }));
    });
  }

  return {
    list: list,
    get: get,
    get toneTypes() { return Object.keys(BASE_URLS); }
  };
})();
