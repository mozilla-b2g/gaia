/* exported Database */
/* global AlbumArt, App, AudioMetadata, ForwardLock, LazyLoader, MediaDB,
          Normalizer, TitleBar */
'use strict';

var Database = (function() {
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
      var files = ['/js/metadata_scripts.js', '/js/metadata/album_art.js'];
      LazyLoader.load(files).then(() => {
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
          App.showOverlay('upgrade');
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
      App.showOverlay('upgrade');
    };

    // This is called when DeviceStorage becomes unavailable because the
    // sd card is removed or because it is mounted for USB mass storage
    // This may be called before onready if it is unavailable to begin with
    musicdb.onunavailable = function(event) {
      var why;
      switch (event.detail) {
        case MediaDB.NOCARD:
          why = 'nocard';
          break;
        case MediaDB.UNMOUNTED:
          why = 'unmounted';
          break;
      }

      App.dbUnavailable(why);
    };

    // If the user removed the sdcard (but there is still internal storage)
    // we just need to stop playing, we don't have to put up an overlay.
    // This event will be followed by deleted events to remove the songs
    // that were on the sdcard and are no longer playable.
    musicdb.oncardremoved = function() {
      App.dbUnavailable('cardremoved');
    };

    musicdb.onenumerable = startupOnEnumerable;
    // Don't refresh the UI on the first onready event, since onenumerable will
    // have already handled the refresh.
    var refreshOnReady = false;

    function startupOnEnumerable() {
      App.dbEnumerable(function() {
        if (musicdb.state === MediaDB.READY) {
          onReady();
        } else {
          musicdb.onready = onReady;
        }
      });
    }

    function onReady() {
      App.dbReady(refreshOnReady, function() {
        // Start scanning for new music
        musicdb.scan();
      });

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
      TitleBar.hideScanProgress();

      if (filesFoundBatch > 0 || filesDeletedWhileScanning > 0) {
        filesFoundWhileScanning = 0;
        filesFoundBatch = 0;
        filesDeletedWhileScanning = 0;
        App.refreshViews();
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

        TitleBar.showScanProgress({
          count: filesFoundWhileScanning,
          artist: metadata.artist,
          title: metadata.title
        });

        if (filesFoundBatch > SCAN_UPDATE_BATCH_SIZE) {
          filesFoundBatch = 0;
          App.refreshViews();
        }
      }
      else {
        // If we get a created event while we are not scanning, then
        // there was probably a new song saved via bluetooth or MMS.
        // We don't have any way to be clever about it; we just have to
        // redisplay the entire view
        App.refreshViews();
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
          App.refreshViews();
        }, DELETE_BATCH_TIMEOUT);
      }
    };
  }

  function incrementPlayCount(fileinfo) {
    fileinfo.metadata.played++;
    musicdb.updateMetadata(fileinfo.name, {played: fileinfo.metadata.played});
  }

  function setSongRating(fileinfo, rated) {
    fileinfo.metadata.rated = rated;
    musicdb.updateMetadata(fileinfo.name, {rated: fileinfo.metadata.rated});
  }

  function getFile(fileinfo, decrypt = false) {
    return new Promise((resolve, reject) => {
      musicdb.getFile(fileinfo.name, (file) => {
        if (file) {
          resolve(file);
        } else {
          reject('unable to get file: ' + fileinfo.name);
        }
      });
    }).then((blob) => {
      if (!decrypt || !fileinfo.metadata.locked) {
        return blob;
      }

      return new Promise(function(resolve, reject) {
        ForwardLock.getKey(function(secret) {
          ForwardLock.unlockBlob(secret, blob, resolve, null, reject);
        });
      });
    });
  }

  function enumerate(...args) {
    return musicdb.enumerate(...args);
  }

  function enumerateAll(...args) {
    return musicdb.enumerateAll(...args);
  }

  function advancedEnumerate(...args) {
    return musicdb.advancedEnumerate(...args);
  }

  function count(...args) {
    return musicdb.count(...args);
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
    // Convert to lowercase and replace accented characters.
    query = Normalizer.toAscii(query.toLocaleLowerCase());
    var direction = (key === 'title') ? 'next' : 'nextunique';

    return musicdb.enumerate('metadata.' + key, null, direction, (result) => {
      if (result === null) {
        callback(result);
        return;
      }

      var resultLowerCased = result.metadata[key].toLocaleLowerCase();
      if (Normalizer.toAscii(resultLowerCased).indexOf(query) !== -1) {
        callback(result);
      }
    });
  }

  function cancelEnumeration(handle) {
    musicdb.cancelEnumeration(handle);
  }

  return {
    init: init,
    incrementPlayCount: incrementPlayCount,
    setSongRating: setSongRating,
    getFile: getFile,
    enumerate: enumerate,
    enumerateAll: enumerateAll,
    advancedEnumerate: advancedEnumerate,
    count: count,
    search: search,
    cancelEnumeration: cancelEnumeration,

    // This is just here for testing.
    get initialScanComplete() {
      return musicdb.initialScanComplete;
    }
  };
})();
