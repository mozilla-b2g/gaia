/* exported Database */
/* global AlbumArt, AudioMetadata, ForwardLock, IDBKeyRange, IntlHelper,
          LazyLoader, MediaDB, Normalizer, service */
'use strict';

var Database = (function() {
  var playlists = [
    {
      id: 'shuffle-all',
      index: 'metadata.title',
      direction: 'next',
      shuffle: true
    },
    {
      id: 'highest-rated',
      index: 'metadata.rated',
      direction: 'prev',
      shuffle: false
    },
    {
      id: 'recently-added',
      index: 'date',
      direction: 'prev',
      shuffle: false
    },
    {
      id: 'most-played',
      index: 'metadata.played',
      direction: 'prev',
      shuffle: false
    },
    {
      id: 'least-played',
      index: 'metadata.played',
      direction: 'next',
      shuffle: false
    }
  ];

  var status = {
    upgrading: false,
    unavailable: false,
    enumerable: false,
    ready: false
  };

  var resolveEnumerable;
  var enumerable = new Promise((resolve) => {
    resolveEnumerable = resolve;
  });

  var resolveReady;
  var ready = new Promise((resolve) => {
    resolveReady = resolve;
  });

  var dbChange = debounce(() => service.broadcast('databaseChange'), 500);

  document.addEventListener('DOMRetranslated', dbChange);

  function debounce(fn, ms) {
    var timeout;
    return () => {
      var args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  // The MediaDB object that manages the filesystem and the database of metadata
  // See init()
  var musicdb;

  function init() {
    // We want to exclude some folders that store ringtones so they don't show
    // up in the music app. The regex matches absolute paths starting with a
    // volume name (e.g. "/volume-name/Ringtones/") or relative paths starting
    // with the excluded folder name (e.g. "Ringtones/").
    var excludedFolders = ['Ringtones', 'Notifications', 'Alarms'];
    var excludeFilter = new RegExp(
      '^(/[^/]*/)?(' + excludedFolders.join('|') + ')/', 'i'
    );

    // Here we use the mediadb.js which gallery is using (in shared/js/)
    // to index our music contents with metadata parsed.
    // So the behaviors of musicdb are the same as the MediaDB in gallery
    musicdb = new MediaDB('music', metadataParserWrapper, {
      indexes: ['metadata.album', 'metadata.artist', 'metadata.title',
                'metadata.rated', 'metadata.played', 'date'],
      excludeFilter: excludeFilter,
      batchSize: 1,
      autoscan: false, // We call scan() explicitly after listing music we know
      updateRecord: updateRecord,
      reparsedRecord: reparsedRecord,
      version: 3
    });

    function metadataParserWrapper(file, onsuccess, onerror) {
      var scripts = [
        '/js/metadata/metadata_scripts.js',
        '/js/metadata/album_art.js'
      ];

      LazyLoader.load(scripts).then(() => {
        return AudioMetadata.parse(file);
      }).then((metadata) => {
        return AlbumArt.process(file, metadata);
      }).then(onsuccess, onerror);
    }

    var startedReparsing = false;

    function updateRecord(record, oldVersion, newVersion) {
      if (oldVersion === 2) {
        // Version 3 of the music DB changes ID3 parsing, so we need to reparse
        // the file from scratch!
        record.needsReparse = true;
        if (!startedReparsing) {
          startedReparsing = true;
          service.broadcast('databaseUpgrade');
        }
      }
      return record.metadata;
    }

    function reparsedRecord(oldMetadata, newMetadata) {
      // We assume that updateRecord has already changed oldMetadata if
      // necessary. (It's not necessary at the moment).
      newMetadata.rated = oldMetadata.rated;
      newMetadata.played = oldMetadata.played;
      return newMetadata;
    }

    // show dialog in upgradestart, when it finished, it will turned to ready.
    musicdb.onupgrading = function(event) {
      status.upgrading = true;
      status.enumerable = false;
      status.ready = false;

      service.broadcast('databaseUpgrade');
    };

    // This is called when DeviceStorage becomes unavailable because the
    // sd card is removed or because it is mounted for USB mass storage
    // This may be called before onready if it is unavailable to begin with
    musicdb.onunavailable = function(event) {
      var reason = event.detail === MediaDB.UNMOUNTED ?
        'pluggedin' : event.detail;

      onUnavailable(reason);
    };

    // If the user removed the sdcard (but there is still internal storage)
    // we just need to stop playing, we don't have to put up an overlay.
    // This event will be followed by deleted events to remove the songs
    // that were on the sdcard and are no longer playable.
    musicdb.oncardremoved = function() {
      service.broadcast('databaseChange');
    };

    function onUnavailable(reason) {
      status.unavailable = reason;
      status.enumerable = false;
      status.ready = false;

      enumerable = new Promise((resolve) => {
        resolveEnumerable = resolve;
      });

      ready = new Promise((resolve) => {
        resolveReady = resolve;
      });

      service.broadcast('databaseUnavailable', reason);
    }

    musicdb.onenumerable = onEnumerable;
    // Don't refresh the UI on the first onready event, since onenumerable will
    // have already handled the refresh.
    var refreshOnReady = false;

    function onEnumerable() {
      if (musicdb.state === MediaDB.READY) {
        onReady();
      } else {
        musicdb.onready = onReady;
      }

      status.upgrading = false;
      status.enumerable = true;

      resolveEnumerable();

      service.broadcast('databaseEnumerable');
    }

    function onReady() {
      // Start scanning for new music
      musicdb.scan();

      status.unavailable = false;
      status.enumerable = true;
      status.ready = true;

      resolveEnumerable();
      resolveReady();

      service.broadcast('databaseReady', refreshOnReady);

      // Subsequent onready events need to refresh the UI.
      refreshOnReady = true;
    }

    var filesDeletedWhileScanning = 0;
    var filesFoundWhileScanning = 0;
    var filesFoundBatch = 0;
    var scanning = false;
    var SCAN_UPDATE_BATCH_SIZE = 25; // Redisplay after this many new files
    var DELETE_BATCH_TIMEOUT = 500;  // Redisplay this long after a delete
    var deleteTimer = null;
    var firstScanDone = false;

    // When musicdb scans, let the user know
    musicdb.onscanstart = function() {
      scanning = true;
      filesFoundWhileScanning = 0;
      filesFoundBatch = 0;
      filesDeletedWhileScanning = 0;
    };

    // And hide the throbber when scanning is done
    musicdb.onscanend = function() {
      scanning = false;

      service.broadcast('scanStopped');

      if (filesFoundBatch > 0 || filesDeletedWhileScanning > 0) {
        filesFoundWhileScanning = 0;
        filesFoundBatch = 0;
        filesDeletedWhileScanning = 0;
        dbChange();
      }

      // If this was the first scan after startup, tell the performance monitors
      // that we finished loading everything.
      if (!firstScanDone) {
        firstScanDone = true;
        window.performance.mark('fullyLoaded');
      }
    };

    // When MediaDB finds new files, it sends created events. During
    // scanning we may get lots of them. Bluetooth file transfer can
    // also result in created events. The way the app is currently
    // structured, all we can do is rebuild the entire UI with the
    // updated list of files. We don't want to do this for every new file
    // but we do want to redisplay every so often.
    musicdb.oncreated = function(event) {
      if (scanning) {
        var metadata = event.detail[0].metadata;
        var n = event.detail.length;
        filesFoundWhileScanning += n;
        filesFoundBatch += n;

        service.broadcast('scanProgress', {
          count: filesFoundWhileScanning,
          artist: metadata.artist,
          title: metadata.title
        });

        if (filesFoundBatch > SCAN_UPDATE_BATCH_SIZE) {
          filesFoundBatch = 0;
          dbChange();
        }
      }
      else {
        // If we get a created event while we are not scanning, then
        // there was probably a new song saved via bluetooth or MMS.
        // We don't have any way to be clever about it; we just have to
        // redisplay the entire view
        dbChange();
      }
    };

    // For deletions, we just set a flag and redisplay when the scan is done.
    // This means that there is a longer window of time when the app might
    // display music that is no longer available.  But the only way to prevent
    // this is to refuse to display any music until the scan completes.
    musicdb.ondeleted = function(event) {
      if (scanning) {
        // If we get a deletion during a scan, just note it for processing
        // when the scan is over
        filesDeletedWhileScanning += event.detail.length;
      }
      else {
        // Otherwise, if we're not scanning, this may be one in a series
        // of deletions (we get lots when the sd card is pulled out, for
        // example). Don't redisplay the UI right away. Instead, wait until the
        // deletions seem to have stopped or paused before updating
        if (deleteTimer) {
          clearTimeout(deleteTimer);
        }
        deleteTimer = setTimeout(function() {
          deleteTimer = null;
          dbChange();
        }, DELETE_BATCH_TIMEOUT);
      }
    };
  }

  function incrementPlayCount(fileinfo) {
    return new Promise((resolve) => {
      fileinfo.metadata.played++;
      musicdb.updateMetadata(fileinfo.name, {
        played: fileinfo.metadata.played
      }, resolve);
    });
  }

  function setSongRating(fileinfo, rated) {
    return new Promise((resolve) => {
      fileinfo.metadata.rated = rated;
      musicdb.updateMetadata(fileinfo.name, {
        rated: fileinfo.metadata.rated
      }, resolve);
    });
  }

  function getFile(fileinfo, decrypt = false) {
    return new Promise((resolve, reject) => {
      ready.then(() => {
        musicdb.getFile(fileinfo.name, (file) => {
          if (file) {
            resolve(file);
          } else {
            reject('unable to get file: ' + fileinfo.name);
          }
        });
      });
    }).then((blob) => {
      if (!decrypt || !fileinfo.metadata.locked) {
        return blob;
      }

      return new Promise(function(resolve, reject) {
        LazyLoader.load('/shared/js/omadrm/fl.js').then(() => {
          ForwardLock.getKey(function(secret) {
            ForwardLock.unlockBlob(secret, blob, resolve, null, reject);
          });
        });
      });
    });
  }

  function getFileInfo(filename) {
    return new Promise(function(resolve, reject) {
      ready
        .then(() => musicdb.getFileInfo(
          filename, (r) => {
            r ? resolve(r) :
              reject('Undefined result for ' + filename);
          }, reject))
        .catch((e) => reject(e));
    });
  }

  /* [deprecated] Low-level database functions */

  function enumerate(...args) {
    return enumerable.then(() => musicdb.enumerate(...args));
  }

  function enumerateAll(...args) {
    return enumerable.then(() => musicdb.enumerateAll(...args));
  }

  function advancedEnumerate(...args) {
    return enumerable.then(() => musicdb.advancedEnumerate(...args));
  }

  function count(...args) {
    return enumerable.then(() => musicdb.count(...args));
  }

  function cancelEnumeration(handle) {
    musicdb.cancelEnumeration(handle);
  }

  /* Sorting helpers */

  IntlHelper.define('titleSorter', 'collator', {
    usage: 'sort', sensitivity: 'base', numeric: true, ignorePunctuation: true
  });

  function _localeSort(collator, a, b) {
    return collator.compare(a, b);
  }

  function _sortArtist(collator, a, b) {
    return _localeSort(collator, a.metadata.artist, b.metadata.artist);
  }

  function _sortAlbum(collator, a, b) {
    return _localeSort(collator, a.metadata.album, b.metadata.album);
  }

  function _sortTitle(collator, a, b) {
    return _localeSort(collator, a.metadata.title, b.metadata.title);
  }

  function _sortTrack(collator, a, b) {
    return (a.metadata.discnum - b.metadata.discnum) ||
           (a.metadata.tracknum - b.metadata.tracknum) ||
           _sortTitle(collator, a, b);
  }

  /* High-level database functions */

  /**
   * Get the list of artists in the music library.
   *
   * @return {Promise} A Promise resolving to an array of artists (represented
   *   as fileinfos of a song from each artist).
   */
  function artists() {
    return new Promise((resolve) => {
      enumerateAll('metadata.artist', null, 'nextunique', (artists) => {
        artists.sort(_sortArtist.bind(null, IntlHelper.get('titleSorter')));
        resolve(artists);
      });
    });
  }

  /**
   * Get the list of albums in the music library.
   *
   * @return {Promise} A Promise resolving to an array of albums (represented
   *   as fileinfos of a song from each album).
   */
  function albums() {
    return new Promise((resolve) => {
      enumerateAll('metadata.album', null, 'nextunique', (albums) => {
        albums.sort(_sortAlbum.bind(null, IntlHelper.get('titleSorter')));
        resolve(albums);
      });
    });
  }

  /**
   * Get the list of songs in the music library.
   *
   * @return {Promise} A Promise resolving to an array of songs (represented
   *   as fileinfos).
   */
  function songs() {
    return new Promise((resolve) => {
      enumerateAll('metadata.title', null, 'next', (songs) => {
        songs.sort(_sortTitle.bind(null, IntlHelper.get('titleSorter')));
        resolve(songs);
      });
    });
  }

  /**
   * Get the total number of songs in the music library.
   *
   * @return {Promise} A Promise resolving to the number of songs in the
   *   database.
   */
  function totalCount() {
    return new Promise((resolve) => {
      count('metadata.title', null, (count) => resolve(count));
    });
  }

  /**
   * Get all the songs for a given artist in the music library.
   *
   * @param {String} name The name of the artist to look up.
   * @return {Promise} A Promise resolving to an array of songs for that artist
   *   (represented as fileinfos).
   */
  function artist(name) {
    return new Promise((resolve) => {
      var range = IDBKeyRange.only(name);
      enumerateAll('metadata.artist', range, 'next', (songs) => {
        var collator = IntlHelper.get('titleSorter');
        songs.sort((a, b) => {
          return _sortAlbum(collator, a, b) || _sortTrack(collator, a, b);
        });
        resolve(songs);
      });
    });
  }

  /**
   * Get all the songs for a given album in the music library.
   *
   * @param {String} name The name of the album to look up.
   * @return {Promise} A Promise resolving to an array of songs for that album
   *   (represented as fileinfos).
   */
  function album(name) {
    return new Promise((resolve) => {
      var range = IDBKeyRange.only(name);
      enumerateAll('metadata.album', range, 'next', (songs) => {
        songs.sort(_sortTrack.bind(null, IntlHelper.get('titleSorter')));
        resolve(songs);
      });
    });
  }

  /**
   * Search the music database for a particular query.
   *
   * @param {String} key The field to query against (e.g. 'title').
   * @param {String} query The string to search for.
   * @param {Function} callback A function to call with the results of the
   *        search, called once per result (plus a final call passing `null`).
   * @return {Object} The handle for this query.
   */
  function search(key, query, callback) {
    return enumerable.then(() => {
      if (!query) {
        callback(null);
        return;
      }

      return LazyLoader.load('/shared/js/text_normalizer.js').then(() => {
        // Convert to lowercase and replace accented characters.
        query = Normalizer.toAscii(query.toLocaleLowerCase());
        var direction = (key === 'title') ? 'next' : 'nextunique';

        return musicdb.enumerate('metadata.' + key, null, direction,
          (result) => {
            if (result === null) {
              callback(result);
              return;
            }

            var resultLowerCased = result.metadata[key].toLocaleLowerCase();
            if (Normalizer.toAscii(resultLowerCased).indexOf(query) !== -1) {
              callback(result);
            }
          });
      });
    });
  }

  return {
    init: init,
    incrementPlayCount: incrementPlayCount,
    setSongRating: setSongRating,
    getFile: getFile,
    getFileInfo: getFileInfo,

    enumerate: enumerate,
    enumerateAll: enumerateAll,
    advancedEnumerate: advancedEnumerate,
    count: count,
    cancelEnumeration: cancelEnumeration,

    artists: artists,
    albums: albums,
    songs: songs,
    totalCount: totalCount,

    artist: artist,
    album: album,

    search: search,
    playlists: playlists,
    status: status,

    // This is just here for testing.
    get initialScanComplete() {
      return musicdb.initialScanComplete;
    }
  };
})();
