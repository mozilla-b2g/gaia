/* global videodb:true,storageState:true,firstScanEnded:true,
  MediaDB,updateDialog,playerShowing,hidePlayer,updateLoadingSpinner,
  addToMetadataQueue,thumbnailList,currentVideo,resetCurrentVideo,
  hideSelectView,thumbnailClickHandler */
/* exported initDB */
'use strict';
//
// This file is part of the Gaia Video app.  It uses the MediaDB libarary
// and the code in metadata.js to ensure that the videos[] array is up to date.
//
function initDB() {
  // use excludeFilter to ignore dummy files from camera.
  videodb = new MediaDB('videos', null,
                        {excludeFilter: /DCIM\/\d{3}MZLLA\/\.VID_\d{4}\.3gp$/});

  videodb.onupgrading = function(evt) {
    // show dialog in upgradestart, when it finished, it will turned to ready.
    storageState = MediaDB.UPGRADING;
    updateDialog();
  };

  videodb.onunavailable = function(event) {
    storageState = event.detail;
    // If player is playing, we need to hide the player which pauses the player
    // and unloads the video file.
    if (playerShowing) {
      hidePlayer(true);
    }

    updateDialog();
  };

  // On devices that have internal and external storage, we get this event
  // when the user pulls the sdcard out. If we're playing a video when that
  // happens, we need to stop or risk a crash.
  videodb.oncardremoved = function() {
    if (playerShowing) {
      hidePlayer(true);
    }
  };

  videodb.onready = function() {
    storageState = false;
    updateDialog();
    enumerateDB();
  };

  videodb.onscanend = function() {
    // If this was the first scan after startup, then tell
    // performance monitors that the app is finally fully loaded and stable.
    if (!firstScanEnded) {
      firstScanEnded = true;
      window.performance.mark('fullyLoaded');
    }

    updateDialog();
    updateLoadingSpinner();
  };

  videodb.oncreated = function(event) {
    event.detail.forEach(videoCreated);
  };
  videodb.ondeleted = function(event) {
    event.detail.forEach(videoDeleted);
  };
}

// Remember whether we've already run the enumeration step
var enumerated = false;

// This function runs once when the app starts up. It gets all known videos
// from the MediaDB and handles the appropriately
function enumerateDB() {
  if (enumerated) {
    return;
  }
  enumerated = true;
  var firstBatchDisplayed = false;

  var batch = [];
  var batchSize = 4;

  videodb.enumerate('date', null, 'prev', function(videoinfo) {
    // When we're done with the enumeration flush any batched files
    if (videoinfo === null) {
      flush();
      return;
    }

    var isVideo = videoinfo.metadata.isVideo;

    // If we know this is not a video, ignore it
    if (isVideo === false) {
      return;
    }

    // If we don't have metadata for this video yet, add it to the
    // metadata queue to get processed. Once the metadata is
    // available, it will be passed to addVideo()
    if (isVideo === undefined) {
      addToMetadataQueue(videoinfo);
      return;
    }

    // If we've parsed the metadata and know this is a video, display it.
    if (isVideo === true) {
      batch.push(videoinfo);
      if (batch.length >= batchSize) {
        flush();
        batchSize *= 2;
      }
    }
  });

  function flush() {
    batch.forEach(addVideo);
    batch.length = 0;

    if (!firstBatchDisplayed) {
      firstBatchDisplayed = true;
      // Tell performance monitors that "above the fold" content is displayed
      // and is ready to interact with.
      window.performance.mark('visuallyLoaded');
      window.performance.mark('contentInteractive');
    }
  }
}

function addVideo(videodata) {
  if (!videodata || !videodata.metadata.isVideo) {
    return;
  }

  // Create the thumbnail view for this video and insert it at the right spot
  var view = thumbnailList.addItem(videodata);
  // thumbnailClickHandler is defined in video.js
  view.addTapListener(thumbnailClickHandler);
  view.updateTitleText();

  // If we just added the first video we need to hide the "no video" overlay
  if (thumbnailList.count === 1) {
    updateDialog();
  }
}

function videoCreated(videoinfo) {
  // When MediaDB tells us about a new video, we add it to the queue for
  // metadata parsing when we are able to do that.
  addToMetadataQueue(videoinfo);
}

function videoDeleted(filename) {

  // In tablet landscape mode, we use currentVideo to be the current playing
  // video and last played video. When deleting file and the file is playing or
  // last played video, we need to change the it to the next, previous or null.
  if (currentVideo && filename === currentVideo.name) {
    resetCurrentVideo();
  }

  // And remove its thumbnail from the document
  thumbnailList.removeItem(filename);

  // If we just deleted the last video we need to display the "no video" overlay
  // and go back to thumbnail list view in case we were in thumbnail select view
  if (thumbnailList.count === 0) {
    updateDialog();
    hideSelectView();
  }
}
