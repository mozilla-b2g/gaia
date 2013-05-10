// This file is part of the Gaia Video app.
//
// It includes functions to obtain metadata for video files. The most
// important parts of this metadata are obtained by loading the video into
// an offscreen <video> element.
//
// The phones we want to run on have only a single hardware h.264 video
// decoder, and gecko is not yet smart enough to share the hardware among
// all the <video> elements that want to use it. So all apps (camera,
// gallery and video) that have permission to use the video hardware must be
// careful to only use it while they are in the foreground and to relinquish
// it when they go to the background.
//
// The video app wants to use <video> elements for metadata parsing and for
// playing videos for the user. It can't do both of these things at the same
// time. The MediaDB metadata parsing architecture assumes that it can,
// however. So the Video app does not pass a metadata parser function to
// MediaDB. MediaDB notifies the app about new video files but does not
// include any metadata with those notifications. Instead, we use the
// queueing and metadata parsing functions in this file to handle metadata
// parsing in an interruptible way.
//
// When we have a new video file that needs metadata, we pass it to
// addToMetadataQueue(). When we need to stop parsing metadata (because we
// want to play a video or because we went to the background) we call
// stopParsingMetadata(). And when we're able to parse metadata again we
// call startParsingMetadata(). When a queued video is processed and its
// metadata is ready, it is saved to MediaDB, and then addVideo() is invoked
// to display the video title and thumbnail.
//

var metadataQueue = [];
var processingQueue = false;
var stopParsingMetadataCallback = null;

// This function queues a fileinfo object with no metadata. When the app is
// able it will obtain metadata for the video and pass the updated fileinfo
// to addVideo() so that it becomes visible to the user.
function addToMetadataQueue(fileinfo) {
  metadataQueue.push(fileinfo);
  startParsingMetadata();
}

// Start or resume metadata parsing, if conditions are right
function startParsingMetadata() {
  // If there is no work queued, or if we're already working, return right away
  if (processingQueue || metadataQueue.length === 0)
    return;

  // Don't parse metadata if we are not the foreground app. When we're
  // in the background we need to allow the foreground app to use the
  // video hardware. Also, if the video player is showing then we
  // can't parse metadata because we're already using the video hardware.
  if (document.mozHidden || playerShowing) {
    return;
  }

  // Start processing the queue
  processingQueue = true;
  showThrobber();
  processFirstQueuedItem();
}

// Stop parsing metadata. If a callback is specified, call it when stopped.
function stopParsingMetadata(callback) {
  // If we're not processing metadata, just call the callback right away
  if (!processingQueue) {
    if (callback)
      callback();
    return;
  }

  // Otherwise, request a stop.
  // This variable acts as a flag to prevent processFirstQueuedItem from
  // creating any more metadatas.
  stopParsingMetadataCallback = callback || true;
}

// If we've been asked to stop processing, then run the callback, and stop.
// Otherwise, if there is nothing in the queue, do nothing.  Otherwise, take
// the first item off the queue, obtain metadata for it, save the metadata
// to the database, and then call addVideo() to display the newly processed
// video to the user. Finally, use setTimeout() to schedule a new call to
// this same function.
//
// XXX: are there any race conditions here?
// Are we guaranteed to always stop and to always call the callback?
//
function processFirstQueuedItem() {
  // If the stop flag is set, call the callback and stop
  if (stopParsingMetadataCallback) {
    var callback = stopParsingMetadataCallback;
    stopParsingMetadataCallback = null;
    processingQueue = false;
    hideThrobber();

    if (callback !== true)
      callback();  // Okay, we've stopped.
    return;
  }

  // If there is no work queued, up return right away
  if (metadataQueue.length === 0) {
    processingQueue = false;
    hideThrobber();
    return;
  }

  // Otherwise, take a fileinfo object from the front of the queue and
  // process it with a <video> tag to obtain size, duration and a poster
  // image. This happens asynchronously. When it is done, we call
  // processFirstQueuedItem() again to re-check the stop flag and process
  // the next item on the queue.
  var fileinfo = metadataQueue.shift();
  videodb.getFile(fileinfo.name, function(file) {
    getMetadata(file, function(metadata) {
      // Associate the metadata with this fileinfo object
      fileinfo.metadata = metadata;

      // Save it to the database
      videodb.updateMetadata(fileinfo.name, metadata);

      // Create and insert a thumbnail for the video
      if (metadata.isVideo)
        addVideo(fileinfo);

      // And process the next video in the queue
      setTimeout(processFirstQueuedItem);
    });
  });
}

// Given a video File object, asynchronously pass an object of metadata to
// the specified callback.
function getMetadata(videofile, callback) {
  // This is the video element that will get the metadata for us.
  // Because of an apparent bug in gecko, it needs to be here rather than
  // something that is shared globally.
  var offscreenVideo = document.createElement('video');
  var metadata = {};

  // If its a video type we don't know how to play, ignore it.
  if (!offscreenVideo.canPlayType(videofile.type)) {
    metadata.isVideo = false;
    callback(metadata);
    return;
  }

  // Create a blob: url for the file. It will be revoked in unload().
  var url = URL.createObjectURL(videofile);

  // Load the video into an offscreen <video> element.
  offscreenVideo.preload = 'metadata';
  offscreenVideo.src = url;

  offscreenVideo.onerror = function(e) {
    // Something went wrong. Maybe the file was corrupt?
    console.error("Can't play video", videofile.name, e);
    metadata.isVideo = false;
    unload();
    callback(metadata);
  };

  offscreenVideo.onloadedmetadata = function() {
    // If videoWidth is 0 then this is likely an audio file (ogg / mp4)
    // with an ambiguous filename extension that makes it look like a video.
    // This test only works correctly if we're using a new offscreen video
    // element each time. If I try to make the element a global, then it
    // retains the size of the last video when a non-video is loaded.
    if (!offscreenVideo.videoWidth) {
      metadata.isVideo = false;
      unload();
      callback(metadata);
      return;
    }

    // Otherwise it is a video!
    metadata.isVideo = true;

    // Base the title on the filename
    metadata.title = fileNameToVideoName(videofile.name);

    // The video element tells us the video duration and size.
    metadata.duration = offscreenVideo.duration;
    metadata.width = offscreenVideo.videoWidth;
    metadata.height = offscreenVideo.videoHeight;

    // If this is a .3gp video file, look for its rotation matrix and
    // then create the thumbnail. Otherwise set rotation to 0 and
    // create the thumbnail immediately.  getVideoRotation is defined
    // in shared/js/media/get_video_rotation.js
    if (/.3gp$/.test(videofile.name)) {
      getVideoRotation(videofile, function(rotation) {
        if (typeof rotation === 'number')
          metadata.rotation = rotation;
        else if (typeof rotation === 'string')
          console.warn('Video rotation:', rotation);
        createThumbnail();
      });
    } else {
      metadata.rotation = 0;
      createThumbnail();
    }
  };

  function createThumbnail() {
    // Videos often begin with a black screen, so skip ahead 5 seconds
    // or 1/10th of the video, whichever is shorter in the hope that we'll
    // get a more interesting thumbnail that way.
    offscreenVideo.currentTime = Math.min(5, offscreenVideo.duration / 10);
    offscreenVideo.onseeked = function() {
      captureFrame(offscreenVideo, metadata, function(poster) {
        if (poster === null) {
          // If something goes wrong in captureFrame, it probably means that
          // this is not a valid video. In any case, if we don't have a
          // thumbnail image we shouldn't try to display it to the user.
          metadata.isVideo = false;
        }
        else {
          metadata.poster = poster;
        }
        unload();
        callback(metadata); // We've got all the metadata we need now.
      });
    };
  }

  // Free the resources being used by the offscreen video element
  function unload() {
    URL.revokeObjectURL(offscreenVideo.src);
    offscreenVideo.removeAttribute('src');
    offscreenVideo.load();
  }

  // Derive the video title from its filename.
  function fileNameToVideoName(filename) {
    filename = filename.split('/').pop()
      .replace(/\.(webm|ogv|mp4|3gp)$/, '')
      .replace(/[_\.]/g, ' ');
    return filename.charAt(0).toUpperCase() + filename.slice(1);
  }
}

function captureFrame(player, metadata, callback) {
  try {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    canvas.width = THUMBNAIL_WIDTH;
    canvas.height = THUMBNAIL_HEIGHT;

    var vw = player.videoWidth, vh = player.videoHeight;
    var tw, th;

    // If a rotation is specified, rotate the canvas context
    switch (metadata.rotation) {
    case 90:
      ctx.translate(THUMBNAIL_WIDTH, 0);
      ctx.rotate(Math.PI / 2);
      tw = THUMBNAIL_HEIGHT;
      th = THUMBNAIL_WIDTH;
      break;
    case 180:
      ctx.translate(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
      ctx.rotate(Math.PI);
      tw = THUMBNAIL_WIDTH;
      th = THUMBNAIL_HEIGHT;
      break;
    case 270:
      ctx.translate(0, THUMBNAIL_HEIGHT);
      ctx.rotate(-Math.PI / 2);
      tw = THUMBNAIL_HEIGHT;
      th = THUMBNAIL_WIDTH;
      break;
    default:
      tw = THUMBNAIL_WIDTH;
      th = THUMBNAIL_HEIGHT;
      break;
    }

    // Figure out what portion of the video we want to draw into the thumbnail
    var scale = Math.min(vw / tw, vh / th);
    var w = tw * scale, h = th * scale;
    var x = (vw - w) / 2, y = (vh - h) / 2;

    // Draw the current video frame into the image
    ctx.drawImage(player, x, y, w, h, 0, 0, tw, th);

    // Convert it to an image file and pass to the callback.
    canvas.toBlob(callback, 'image/jpeg');
  }
  catch (e) {
    console.error('Exception in captureFrame:', e, e.stack);
    callback(null);
  }
}
