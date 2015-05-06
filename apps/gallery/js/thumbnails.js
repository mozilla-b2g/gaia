/* exported Thumbnails */
/* global ThumbnailList, ThumbnailDateGroup, MediaDB, LazyLoader */
/* global photodb, files, picking, metadataParser */
(function(exports) {
  'use strict';

  // This is the object we export
  var thumbnails = exports.Thumbnails = {};

  // This is the container element for the thumbnails.  We put them here
  // so that we can start creating them before the DOM is loaded. Once
  // the DOM is loaded and we've been localized, we'll insert this into
  // the document in the right spot.
  thumbnails.container = document.createElement('ul');
  thumbnails.container.id = 'thumbnails';

  // This is the ThumbnailList object that represents the list of thumbnails
  // contained in the thumbnailContainer.
  thumbnails.list = new ThumbnailList(ThumbnailDateGroup, thumbnails.container);

  // Localize dates and item desc in thumbnails list when the locale changes
  // Bug 1135256: Having a listener in ThumbnailList prevents them from
  // being garbage collected since ready() holds a strong reference, so
  // we have a singleton listener here.
  navigator.mozL10n.ready(function localize() {
    thumbnails.list.localize();
  });

  // How many thumbnails are visible on a page.
  // Batch sizes are based on this.
  var PAGE_SIZE = 15;

  // Create the MediaDB object so it can start initializing the DB right away
  photodb = new MediaDB('pictures',  // jshint ignore:line
                        metadataParserWrapper, {
    version: 2,
    autoscan: false,     // We're going to call scan() explicitly
    batchHoldTime: 2000, // Batch files during scanning
    batchSize: 3         // Max batch size when scanning
  });

  var metadataParserLoaded = false;

  // This is defined here only because we need it defined when we call
  // the MediaDB() constructor. It will not be called until we start
  // scanning, so it does not matter that it uses things that are not 
  // defined yet.
  function metadataParserWrapper(file, onsuccess, onerror, bigFile) {
    if (metadataParserLoaded) {
      metadataParser(file, onsuccess, onerror, bigFile);
      return;
    }

    LazyLoader.load(['js/metadata_scripts.js',
                     'shared/js/media/crop_resize_rotate.js'], function() {
                       metadataParserLoaded = true;
                       metadataParser(file, onsuccess, onerror, bigFile);
                     });
  }

  // These variables will hold the functions that will resolve the promises
  var firstPageResolver;
  var completionResolver;

  // Create promises to store in the thumbnails object so that
  // the code that has not loaded yet can find out when we're done.
  thumbnails.firstpage = new Promise(function(resolve, reject) {
    firstPageResolver = resolve;

    thumbnails.complete = new Promise(function(resolve, reject) {
      completionResolver = resolve;

      // Now that the promises are ready, start creating thumbnails
      createThumbnails();
    });
  });

  function createThumbnails() {
    // If the db is enumerable (or fully ready), start enumerating it.
    // Otherwise wait until it becomes ready enumerable.
    if (photodb.state === MediaDB.READY ||
        photodb.state === MediaDB.ENUMERABLE) {
      enumerateDB();
    }
    else {
      photodb.addEventListener('enumerable', enumerateDB);
    }
  }

  function enumerateDB() {
    // Temporary arrays to hold enumerated files
    var batch = [];
    var batchsize = PAGE_SIZE;
    var firstPageDisplayed = false;

    photodb.enumerate('date', null, 'prev', function(fileinfo) {
      if (fileinfo) {
        // For a pick activity, don't display videos
        if (picking && fileinfo.metadata.video) {
          return;
        }

        // Bug 1003036 fixed an issue where explicitly created preview
        // images could be saved with fractional sizes. We don't do that
        // anymore, but we still need to clean up existing bad data here.
        var metadata = fileinfo.metadata;
        if (metadata &&
            metadata.preview &&
            metadata.preview.filename) {
          metadata.preview.width = Math.floor(metadata.preview.width);
          metadata.preview.height = Math.floor(metadata.preview.height);
        }

        batch.push(fileinfo);
        if (batch.length >= batchsize) {
          flush();
          batchsize *= 2;
        }
      }
      else {
        done();
      }
    });

    function flush() {
      batch.forEach(thumb);
      batch.length = 0;
      if (!firstPageDisplayed) {
        firstPageDisplayed = true;
        // Resolve the thumbnails.firstpage promise to tell the UI
        // that "above the fold" content is ready to display
        firstPageResolver();
      }
    }

    function thumb(fileinfo) {
      files.push(fileinfo);              // remember the file
      // Create the thumbnail view for this file
      // and insert it at the right spot
      thumbnails.list.addItem(fileinfo);
    }

    function done() {
      flush();
      // Resolve the thumbnails.complete promise
      completionResolver();
    }
  }
}(window));
