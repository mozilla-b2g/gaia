//
// This file is part of the Gaia Video app.  It uses the MediaDB libarary
// and the code in metadata.js to ensure that the videos[] array is up to date.
//
function initDB() {
  videodb = new MediaDB('videos');

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
    if (playerShowing)
      hidePlayer(true);
  };

  videodb.onready = function() {
    storageState = false;
    updateDialog();
    enumerateDB();
  };

  videodb.onscanend = function() {
    firstScanEnded = true;
    updateDialog();
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
  if (enumerated)
    return;
  enumerated = true;

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
  }
}

function addVideo(videodata) {
  if (!videodata || !videodata.metadata.isVideo) {
    return;
  }

  var insertPosition;

  if (videos.length === 0 || videodata.date > videos[0].date) {
    // This video is the first or is newer than the first one.
    // This is the most common case for new videos.
    insertPosition = 0;
  }
  else if (videodata.date < videos[videos.length - 1].date) {
    // This video is older than the last one.
    // This is the most common case when we enumerate the database.
    insertPosition = videos.length;
  }
  else {
    // Otherwise we have to search for the right insertion spot
    insertPosition = binarysearch(videos, videodata, compareVideosByDate);
  }

  // Insert the video info into the array
  videos.splice(insertPosition, 0, videodata);

  // Create the document element for this video and insert it at the right spot
  var thumbnail = createThumbnailItem(insertPosition);
  var thumbnails = dom.thumbnails.children;
  dom.thumbnails.insertBefore(thumbnail, thumbnails[insertPosition]);

  // increment the index of each of the thumbnails after the new one
  for (var i = insertPosition; i < thumbnails.length; i++) {
    thumbnails[i].dataset.index = i;
  }

  // If we just added the first video we need to hide the "no video" overlay
  if (videos.length === 1)
    updateDialog();

  // This comparison function is used for sorting arrays and doing binary
  // search on the resulting sorted arrays.
  function compareVideosByDate(a, b) {
    return b.date - a.date;
  }

  // Assuming that array is sorted according to comparator, return the
  // array index at which element should be inserted to maintain sort order
  function binarysearch(array, element, comparator, from, to) {
    if (comparator === undefined)
      comparator = function(a, b) {
        return a - b;
      };

    if (from === undefined)
      return binarysearch(array, element, comparator, 0, array.length);

    if (from === to)
      return from;

    var mid = Math.floor((from + to) / 2);

    var result = comparator(element, array[mid]);
    if (result < 0)
      return binarysearch(array, element, comparator, from, mid);
    else
      return binarysearch(array, element, comparator, mid + 1, to);
  }
}

function videoCreated(videoinfo) {
  // When MediaDB tells us about a new video, we add it to the queue for
  // metadata parsing when we are able to do that.
  addToMetadataQueue(videoinfo);
}

function videoDeleted(filename) {
  // Find the deleted video in our videos array
  for (var n = 0; n < videos.length; n++) {
    if (videos[n].name === filename)
      break;
  }

  if (n >= videos.length)  // It was a video we didn't know about
    return;

  // Remove the video from the array
  videos.splice(n, 1)[0];

  // And remove its thumbnail from the document
  var thumbnails = dom.thumbnails.children;
  dom.thumbnails.removeChild(thumbnails[n]);

  // Change the index associated with all the thumbnails after the deleted one
  // This keeps the data-index attribute of each thumbnail element in sync
  // with the files[] array.
  for (var i = n; i < thumbnails.length; i++) {
    thumbnails[i].dataset.index = i;
  }

  // If we just deleted the last video we need to display the "no video" overlay
  // and go back to thumbnail list view in case we were in thumbnail select view
  if (videos.length === 0) {
    updateDialog();
    hideSelectView();
  }
}
