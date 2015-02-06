'use strict';
/* global MediaDB, LazyLoader, metadataParser */

var photodb;
var videostorage;

// The first thing we do is start initializing the MediaDB object
// so that we get the fastest possible startup time.
startDBInitialization();

// Create the MediaDB object.
function startDBInitialization() {
  photodb = new MediaDB('pictures', metadataParserWrapper, {
    version: 2,
    autoscan: false,     // We're going to call scan() explicitly
    batchHoldTime: 2000, // Batch files during scanning
    batchSize: 3         // Max batch size when scanning
  });

  // This is where we find videos once the photodb notifies us that a
  // new video poster image has been detected. Note that we need this
  // even during a pick activity when we're not displaying videos
  // because we might still might find and parse metadata for new
  // videos during the scanning process.
  videostorage = navigator.getDeviceStorage('videos');

  var loaded = false;
  function metadataParserWrapper(file, onsuccess, onerror, bigFile) {
    if (loaded) {
      metadataParser(file, onsuccess, onerror, bigFile);
      return;
    }

    LazyLoader.load(['js/metadata_scripts.js',
                     'shared/js/media/crop_resize_rotate.js'], function() {
      loaded = true;
      metadataParser(file, onsuccess, onerror, bigFile);
    });
  }
}
