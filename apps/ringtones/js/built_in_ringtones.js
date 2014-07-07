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
 *   @param {String} toneType The type of tone to get ('ringtone' or
 *     'alerttone').
 *   @param {String} id The ID of the tone to get.
 *   @return {Promise} A promise returning the requested BuiltInRingtone.
 *
 * toneTypes:
 *   An array of the valid tone types ('ringtone' and 'alerttone').
 */
window.builtInRingtones = (function() {
  /**
   * Create a new built-in ringtone object.
   *
   * @param {String} filename The filename of the ringtone.
   * @param {String} baseURL The base path where |filename| is located.
   */
  function BuiltInRingtone(filename, baseURL) {
    // Strip the file extension for the ID and l10n ID to make it easier to
    // change the file extensions in the future.
    this._rootName = filename.replace(/\.\w+$/, '');
    this._url = baseURL + filename;
  }

  BuiltInRingtone.prototype = {
    /**
     * @return {String} The localized name of the tone. Assumes that mozL10n has
     *   been initialized.
     */
    get name() {
      return navigator.mozL10n.get(this.l10nID);
    },

    /**
     * @return {String} The l10n ID for the tone's name.
     */
    get l10nID() {
      return this._rootName.replace('.', '_');
    },

    /**
     * @return {String} A unique ID for the tone.
     */
    get id() {
      return 'builtin:' + this._rootName;
    },

    /**
     * @return {String} A URL pointing to the tone's audio data.
     */
    get url() {
      return this._url;
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
        xhr.responseType = 'blob';
        xhr.send();
        xhr.onload = function() {
          // Use slice() to strip the "application/xml" MIME type from the Blob,
          // since it's not XML! (We'll just let consumers infer what the type
          // really is.)
          resolve(xhr.response.slice());
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
   * Check if a BuiltInRingtone ID refers to a particular filename.
   *
   * @param {String} id The BuiltInRingtone's ID.
   * @param {String} filename The filename.
   * @return {Boolean} True if the id and filename match, false otherwise.
   */
  function idMatchesFilename(id, filename) {
    return id === 'builtin:' + filename.replace(/\.\w+$/, '');
  }

  var baseURLs = {
    'ringtone': '/shared/resources/media/ringtones/',
    'alerttone': '/shared/resources/media/notifications/'
  };

  var filenamesCache = {};

  /**
   * Read the list.json file to get the names of all sounds we know about.
   * These filenames are all relative to baseURL. This function caches its
   * results so that subsequent calls are speedy.
   *
   * @param {String} baseURL The path containing the list.json file.
   * @return {Promise} A promise returning an array of filenames.
   */
  function getSoundFilenames(baseURL) {
    return new Promise(function(resolve, reject) {
      if (baseURL in filenamesCache) {
        resolve(filenamesCache[baseURL]);
        return;
      }

      var xhr = new XMLHttpRequest();
      xhr.open('GET', baseURL + 'list.json');
      xhr.responseType = 'json';
      xhr.send(null);

      xhr.onload = function() {
        // The list.json file organizes the sound urls as an object instead of
        // an array for some reason
        var filenames = Object.keys(xhr.response);
        filenamesCache[baseURL] = filenames;
        resolve(filenames);
      };

      xhr.onerror = function() {
        var err = new Error('Could not read sounds list: ' + baseURL +
                            ' (status: ' + xhr.status + ')');
        console.error(err);
        reject(err);
      };
    });
  }

  function list(toneType) {
    if (!(toneType in baseURLs)) {
      return new Error('tone type not supported: ' + toneType);
    }

    var baseURL = baseURLs[toneType];
    return getSoundFilenames(baseURL).then(function(filenames) {
      return filenames.map(function(filename) {
        return new BuiltInRingtone(filename, baseURL);
      });
    });
  }

  function get(toneType, id) {
    if (!(toneType in baseURLs)) {
      return new Error('tone type not supported: ' + toneType);
    }

    var baseURL = baseURLs[toneType];
    return getSoundFilenames(baseURL).then(function(filenames) {
      for (var i = 0; i < filenames.length; i++) {
        if (idMatchesFilename(id, filenames[i])) {
          return new BuiltInRingtone(filenames[i], baseURL);
        }
      }
      var err = new Error('No ' + toneType + ' found with id = ' + id);
      console.error(err);
      throw err;
    });
  }

  return {
    list: list,
    get: get,
    get toneTypes() { return Object.keys(baseURLs); }
  };
})();
