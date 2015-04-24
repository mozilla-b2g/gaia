/* exported musicdb, initDB */
/* global App, AudioMetadata, LazyLoader, MediaDB, ModeManager, MODE_LIST,
          MODE_PICKER, MODE_TILES, MusicComms, PlayerView, TabBar, TilesView */
'use strict';

// The MediaDB object that manages the filesystem and the database of metadata
// See initDB()
var musicdb;
// We use this flag when switching views. We want to hide the scan progress
// bar (to show the titlebar) when we enter sublist mode or player mode
var displayingScanProgress = false;
var firstScanDone = false;
// We need to know if we're in the middle of reparsing all the existing music
// to show the correct overlay.
var reparsingMetadata = false;

function initDB() {
  // We want to exclude some folders that store ringtones so they don't show up
  // in the music app. The regex matches absolute paths starting with a volume
  // name (e.g. "/volume-name/Ringtones/") or relative paths starting with the
  // excluded folder name (e.g. "Ringtones/").
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
    LazyLoader.load('js/metadata_scripts.js', function() {
      AudioMetadata.parse(file).then(onsuccess, onerror);
    });
  }

  function updateRecord(record, oldVersion, newVersion) {
    if (oldVersion === 2) {
      // Version 3 of the music DB changes ID3 parsing, so we need to reparse
      // the file from scratch!
      record.needsReparse = true;
      reparsingMetadata = true;
    }
    return record.metadata;
  }

  function reparsedRecord(oldMetadata, newMetadata) {
    // We assume that updateRecord has already changed oldMetadata if necessary.
    // (It's not necessary at the moment).
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
    // If we were playing a song, stop it right away since we
    // can't access the file anymore.
    stopPlayingAndReset();

    // Also let the user know why they can't play songs anymore
    var why = event.detail;
    if (why === MediaDB.NOCARD) {
      App.showOverlay('nocard');
    } else if (why === MediaDB.UNMOUNTED) {
      App.showOverlay('pluggedin');
    }
  };

  // If the user removed the sdcard (but there is still internal storage)
  // we just need to stop playing, we don't have to put up an overlay.
  // This event will be followed by deleted events to remove the songs
  // that were on the sdcard and are no longer playable.
  musicdb.oncardremoved = stopPlayingAndReset;

  function stopPlayingAndReset() {
    // Stop and reset the player then back to tiles mode to avoid
    // crash.  We could be smarter here by looking at the currently
    // playing song and only stopping it if its volume is not in the
    // list of available volumes. But that could potentially cause
    // problems if we are playing a playlist and some songs are on one
    // storage area and some in another. Yanking out an sdcard is
    // uncommon enough that it should be fine to always stop playing.
    if (typeof PlayerView !== 'undefined') {
      PlayerView.stop();
    }

    // TabBar should be set to "mix" to sync with the tab selection.
    if (!App.pendingPick) {
      TabBar.option = 'mix';
      ModeManager.start(MODE_TILES);
      TilesView.hideSearch();
    }
  }

  musicdb.onenumerable = startupOnEnumerable;

  function startupOnEnumerable() {
    // If we've been upgrading, hide that now
    if (App.currentOverlay === 'upgrade') {
      App.showOverlay(null);
    }

    // Display music that we already know about
    App.showCurrentView(function() {
      reparsingMetadata = false;
      // Hide the  spinner once we've displayed the initial screen
      document.getElementById('spinner-overlay').classList.add('hidden');

      // Only init the communication when music is not in picker mode.
      if (document.URL.indexOf('#pick') === -1) {
        // We need to wait to init the music comms until the UI is fully loaded
        // because the init of music comms could slow down the startup time.
        MusicComms.init();
      }

      if (musicdb.state === MediaDB.READY) {
        startupOnReady();
      }
      else {
        musicdb.onready = startupOnReady;
      }
    });
  }

  // This function gets called when we're first launched, after
  // startupOnEnumerable has run and when or after the mediadb has
  // reached the ready state.
  function startupOnReady() {
    // Hide the nocard or pluggedin overlay if it is displayed
    if (App.currentOverlay === 'nocard' || App.currentOverlay === 'pluggedin') {
      App.showOverlay(null);
    }

    // Start scanning for new music
    musicdb.scan();

    // Now we need to set up a new onready event handler that will handle
    // any subsequent ready events we get. (If the user mounts and unmounts
    // usb mass storage, for example.)
    musicdb.onready = postStartupOnReady;
  }

  function postStartupOnReady() {
    // Hide the nocard or pluggedin overlay if it is displayed
    if (App.currentOverlay === 'nocard' || App.currentOverlay === 'pluggedin') {
      App.showOverlay(null);
    }

    // Display music that we already know about
    App.showCurrentView(function() {
      // Start scanning for new music
      musicdb.scan();
    });
  }

  var filesDeletedWhileScanning = 0;
  var filesFoundWhileScanning = 0;
  var filesFoundBatch = 0;
  var scanning = false;
  var SCAN_UPDATE_BATCH_SIZE = 25; // Redisplay after this many new files
  var DELETE_BATCH_TIMEOUT = 500;  // Redisplay this long after a delete
  var deleteTimer = null;

  var scanProgress = document.getElementById('scan-progress');
  var scanCount = document.getElementById('scan-count');
  var scanArtist = document.getElementById('scan-artist');
  var scanTitle = document.getElementById('scan-title');

  // When musicdb scans, let the user know
  musicdb.onscanstart = function() {
    scanning = true;
    displayingScanProgress = false;
    filesFoundWhileScanning = 0;
    filesFoundBatch = 0;
    filesDeletedWhileScanning = 0;
  };

  // And hide the throbber when scanning is done
  musicdb.onscanend = function() {
    scanning = false;
    if (displayingScanProgress) {
      scanProgress.classList.add('hidden');
      displayingScanProgress = false;
    }
    if (filesFoundBatch > 0 || filesDeletedWhileScanning > 0) {
      filesFoundWhileScanning = 0;
      filesFoundBatch = 0;
      filesDeletedWhileScanning = 0;
      App.showCurrentView();
    }

    // If this was the first scan after startup, tell the performance monitors
    // that we finished loading everything.
    if (!firstScanDone) {
      firstScanDone = true;
      window.performance.mark('fullyLoaded');
      window.dispatchEvent(new CustomEvent('moz-app-loaded'));
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
      var currentMode = ModeManager.currentMode;
      if (!displayingScanProgress &&
          (currentMode === MODE_TILES ||
           currentMode === MODE_LIST ||
           currentMode === MODE_PICKER))
      {
        displayingScanProgress = true;
        scanProgress.classList.remove('hidden');
      }
      var n = event.detail.length;

      filesFoundWhileScanning += n;
      filesFoundBatch += n;

      scanCount.textContent = filesFoundWhileScanning;

      var metadata = event.detail[0].metadata;
      scanArtist.textContent = metadata.artist || '';
      scanTitle.textContent = metadata.title || '';

      if (filesFoundBatch > SCAN_UPDATE_BATCH_SIZE) {
        filesFoundBatch = 0;
        App.showCurrentView();
      }
    }
    else {
      // If we get a created event while we are not scanning, then
      // there was probably a new song saved via bluetooth or MMS.
      // We don't have any way to be clever about it; we just have to
      // redisplay the entire view
      App.showCurrentView();
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
      // of deletions (we get lots when the sd card is pulled out, for example)
      // Don't redisplay the UI right away. Instead, wait until the deletions
      // seem to have stopped or paused before updating
      if (deleteTimer) {
        clearTimeout(deleteTimer);
      }
      deleteTimer = setTimeout(function() {
        deleteTimer = null;
        App.showCurrentView();    // Redisplay the UI
      }, DELETE_BATCH_TIMEOUT);
    }
  };

  // If the overlay is displayed during a pick, let the user get out of it
  document.getElementById('overlay-cancel-button')
    .addEventListener('click', function() {
      if (App.pendingPick) {
        App.pendingPick.postError('pick cancelled');
      }
    });
}
