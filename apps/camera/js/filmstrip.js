/*
 * filmstrip.js: filmstrip, thumbnails and previews for the camera.
 */

'use strict';

var Filmstrip = (function() {

  // This array holds all the data we need for image and video previews
  var items = [];
  var currentItemIndex;

  // Maximum number of thumbnails in the filmstrip
  var MAX_THUMBNAILS = 5;
  var THUMBNAIL_WIDTH = 46;  // size of each thumbnail
  var THUMBNAIL_HEIGHT = 46;

  // Timer for auto-hiding the filmstrip
  var hideTimer = null;

  // Document elements we care about
  var filmstrip = document.getElementById('filmstrip');
  var preview = document.getElementById('preview');
  var frameContainer = document.getElementById('frame-container');
  var mediaFrame = document.getElementById('media-frame');
  var cameraButton = document.getElementById('camera-button');
  var shareButton = document.getElementById('share-button');
  var deleteButton = document.getElementById('delete-button');
  var filmstripGalleryButton =
    document.getElementById('filmstrip-gallery-button');

  // Offscreen elements for generating thumbnails with
  var offscreenImage = new Image();
  var offscreenVideo = document.createElement('video');

  // Set up event handlers
  cameraButton.onclick = returnToCameraMode;
  deleteButton.onclick = deleteCurrentItem;
  shareButton.onclick = shareCurrentItem;
  filmstripGalleryButton.onclick = Camera.galleryBtnPressed;
  mediaFrame.addEventListener('dbltap', handleDoubleTap);
  mediaFrame.addEventListener('transform', handleTransform);
  mediaFrame.addEventListener('pan', handlePan);
  mediaFrame.addEventListener('swipe', handleSwipe);

  // Generate gesture events
  var gestureDetector = new GestureDetector(mediaFrame);
  gestureDetector.startDetecting();

  // Create the MediaFrame for previews
  var frame = new MediaFrame(mediaFrame);

  // Start off with it positioned correctly.
  setOrientation(Camera._phoneOrientation);

  // If we're running in secure mode, we never want the user to see the
  // gallery button or the share button.
  filmstrip.removeChild(filmstripGalleryButton);
  shareButton.parentNode.removeChild(shareButton);

  function isShown() {
    return !filmstrip.classList.contains('hidden');
  }

  function hide() {
    filmstrip.classList.add('hidden');
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  }

  /*
   * With a time, show the filmstrip and then hide it after the time is up.
   * Without time, show until hidden.
   * Tapping in the camera toggles it. And if toggled on, it will be on
   * without a timer.
   * It is always on when a preview is shown.
   * After recording a photo or video, it is shown for 5 seconds.
   * And it is also shown for 5 seconds after leaving preview mode.
   */
  function show(time) {
    filmstrip.classList.remove('hidden');
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    if (time)
      hideTimer = setTimeout(hide, time);
  }

  filmstrip.onclick = function(event) {
    var target = event.target;
    if (!target || !target.classList.contains('thumbnail'))
      return;

    var index = parseInt(target.dataset.index);
    previewItem(index);
    // If we're showing previews be sure we're showing the filmstrip
    // with no timeout and be sure that the viewfinder video is paused.
    show();
    Camera.viewfinder.pause();
    // If there is a preview shown, we want the gallery button in
    // the filmstrip
    filmstripGalleryButton.classList.remove('hidden');
  };

  function previewItem(index) {
    // Don't redisplay the item if it is already displayed
    if (currentItemIndex === index)
      return;

    var item = items[index];

    if (item.isImage) {
      frame.displayImage(item.blob, item.width, item.height, item.preview);
    }
    else if (item.isVideo) {
      frame.displayVideo(item.blob, item.width, item.height, item.rotation);
    }

    preview.classList.remove('offscreen');
    currentItemIndex = index;

    // Highlight the border of the thumbnail we're previewing
    // and clear the highlight on all others
    items.forEach(function(item, itemindex) {
      if (itemindex === index)
        item.element.classList.add('previewed');
      else
        item.element.classList.remove('previewed');
    });
  }

  function returnToCameraMode() {
    Camera.viewfinder.play();        // Restart the viewfinder
    show(Camera.FILMSTRIP_DURATION); // Fade the filmstrip after a delay
    // hide the gallery button in the filmstrip
    filmstripGalleryButton.classList.add('hidden');
    preview.classList.add('offscreen');
    frame.clear();
    if (items.length > 0)
      items[currentItemIndex].element.classList.remove('previewed');
    currentItemIndex = null;
   }

  function deleteCurrentItem() {
    var item = items[currentItemIndex];
    var msg, storage, filename;

    if (item.isImage) {
      msg = navigator.mozL10n.get('delete-photo?');
      storage = Camera._pictureStorage;
      filename = item.filename;
    }
    else {
      msg = navigator.mozL10n.get('delete-video?');
      storage = Camera._videoStorage;
      filename = item.filename;
    }

    // The system app is not allowed to use confirm, I think
    // so if we're running in secure mode, just delete the file without
    // confirmation
    if (Camera._secureMode || confirm(msg)) {
      // Remove the item from the array of items
      items.splice(currentItemIndex, 1);

      // Remove the thumbnail image from the filmstrip
      filmstrip.removeChild(item.element);
      URL.revokeObjectURL(item.element.src);

      // Renumber the item elements
      items.forEach(function(item, index) {
        item.element.dataset.index = index;
      });

      // If there are no more items, go back to the camera
      if (items.length === 0) {
        returnToCameraMode();
      }
      else {
        // Otherwise, switch the frame to display the next item. But if
        // we just deleted the last item, then we'll need to display the
        // previous item.
        var newindex = currentItemIndex;
        if (newindex >= items.length)
          newindex = items.length - 1;
        currentItemIndex = null;
        previewItem(newindex);
      }

      // Actually delete the file
      storage.delete(filename).onerror = function(e) {
        console.warn('Failed to delete', filename,
                     'from DeviceStorage:', e.target.error);
      }
    }
  }

  function shareCurrentItem() {
    if (Camera._secureMode)
      return;
    var item = items[currentItemIndex];
    var type = item.isImage ? 'image/*' : 'video/*';
    var nameonly = item.filename.substring(item.filename.lastIndexOf('/') + 1);
    var activity = new MozActivity({
      name: 'share',
      data: {
        type: type,
        number: 1,
        blobs: [item.blob],
        filenames: [nameonly],
        filepaths: [item.filename] /* temporary hack for bluetooth app */
      }
    });
    activity.onerror = function(e) {
      console.warn('Share activity error:', activity.error.name);
    }
  }

  function handleDoubleTap(e) {
    if (!items[currentItemIndex].isImage)
      return;

    var scale;
    if (frame.fit.scale > frame.fit.baseScale)
      scale = frame.fit.baseScale / frame.fit.scale;
    else
      scale = 2;

    // If the phone orientation is 0 (unrotated) then the gesture detector's
    // event coordinates match what's on the screen, and we use them to
    // specify a point to zoom in or out on. For other orientations we could
    // calculate the correct point, but instead just use the midpoint.
    var x, y;
    if (Camera._phoneOrientation === 0) {
      x = e.detail.clientX;
      y = e.detail.clientY;
    }
    else {
      x = mediaFrame.offsetWidth / 2;
      y = mediaFrame.offsetHeight / 2;
    }

    frame.zoom(scale, x, y, 200);
  }

  function handleTransform(e) {
    if (!items[currentItemIndex].isImage)
      return;

    // If the phone orientation is 0 (unrotated) then the gesture detector's
    // event coordinates match what's on the screen, and we use them to
    // specify a point to zoom in or out on. For other orientations we could
    // calculate the correct point, but instead just use the midpoint.
    var x, y;
    if (Camera._phoneOrientation === 0) {
      x = e.detail.midpoint.clientX;
      y = e.detail.midpoint.clientY;
    }
    else {
      x = mediaFrame.offsetWidth / 2;
      y = mediaFrame.offsetHeight / 2;
    }

    frame.zoom(e.detail.relative.scale, x, y);
  }

  function handlePan(e) {
    if (!items[currentItemIndex].isImage)
      return;

    // The gesture detector event does not take our CSS rotation into
    // account, so we have to pan by a dx and dy that depend on how
    // the MediaFrame is rotated
    var dx, dy;
    switch (Camera._phoneOrientation) {
    case 0:
      dx = e.detail.relative.dx;
      dy = e.detail.relative.dy;
      break;
    case 90:
      dx = -e.detail.relative.dy;
      dy = e.detail.relative.dx;
      break;
    case 180:
      dx = -e.detail.relative.dx;
      dy = -e.detail.relative.dy;
      break;
    case 270:
      dx = e.detail.relative.dy;
      dy = -e.detail.relative.dx;
      break;
    }

    frame.pan(dx, dy);
  }

  function handleSwipe(e) {
    // Because the stuff around the media frame does not change position
    // when the phone is rotated, we don't alter these directions based
    // on orientation. To dismiss the preview, the user always swipes toward
    // the filmstrip.

    switch (e.detail.direction) {
    case 'up':   // close the preview if the swipe is fast enough
      if (e.detail.vy < -1)
        returnToCameraMode();
      break;
    case 'left': // go to next image if fast enough
      if (e.detail.vx < -1 && currentItemIndex < items.length - 1)
        previewItem(currentItemIndex + 1);
      break;
    case 'right': // go to previous image if fast enough
      if (e.detail.vx > 1 && currentItemIndex > 0)
        previewItem(currentItemIndex - 1);
      break;
    }
  }

  function addImage(filename, blob) {
    parseJPEGMetadata(blob, function getPreviewBlob(metadata) {
      if (metadata.preview) {
        var previewBlob = blob.slice(metadata.preview.start,
                                     metadata.preview.end,
                                     'image/jpeg');

        offscreenImage.src = URL.createObjectURL(previewBlob);
        offscreenImage.onload = function() {
          createThumbnailFromElement(offscreenImage, false, 0,
                                     function(thumbnail) {
                                       addItem({
                                         isImage: true,
                                         filename: filename,
                                         thumbnail: thumbnail,
                                         blob: blob,
                                         width: metadata.width,
                                         height: metadata.height,
                                         preview: metadata.preview
                                       });
                                     });
          URL.revokeObjectURL(offscreenImage.src);
          offscreenImage.onload = null;
          offscreenImage.src = null;
        };
      }
    }, function logerr(msg) { console.warn(msg); });
  }

  function addVideo(filename) {
    var request = Camera._videoStorage.get(filename);
    request.onerror = function() {
      console.warn('addVideo:', filename, request.error.name);
    };
    request.onsuccess = function() {
      var blob = request.result;
      getVideoRotation(blob, function(rotation) {
        if (typeof rotation !== 'number') {
          console.warn('Unexpected rotation:', rotation);
          rotation = 0;
        }

        var url = URL.createObjectURL(blob);

        offscreenVideo.preload = 'metadata';
        offscreenVideo.style.width = THUMBNAIL_WIDTH + 'px';
        offscreenVideo.style.height = THUMBNAIL_HEIGHT + 'px';
        offscreenVideo.src = url;

        offscreenVideo.onerror = function() {
          URL.revokeObjectURL(url);
          offscreenVideo.onerror = null;
          offscreenVideo.onloadedmetadata = null;
          offscreenVideo.removeAttribute('src');
          offscreenVideo.load();
          console.warn('not a video file', filename);
        }

        offscreenVideo.onloadedmetadata = function() {
          createThumbnailFromElement(offscreenVideo, true, rotation,
                                     function(thumbnail) {
                                       addItem({
                                         isVideo: true,
                                         filename: filename,
                                         thumbnail: thumbnail,
                                         blob: blob,
                                         width: offscreenVideo.videoWidth,
                                         height: offscreenVideo.videoHeight,
                                         rotation: rotation
                                       });
                                     });
          URL.revokeObjectURL(url);
          offscreenVideo.onerror = null;
          offscreenVideo.onloadedmetadata = null;
          offscreenVideo.removeAttribute('src');
          offscreenVideo.load();
        };
      });
    };
  }

  // Add a thumbnail to the filmstrip.
  // The details object contains everything we need to know
  // to display the thumbnail and preview the image or video
  function addItem(item) {
    // Thumbnails go from most recent to least recent.
    items.unshift(item);

    // Create an image element for this new thumbnail and display it
    item.element = new Image();
    item.element.src = URL.createObjectURL(item.thumbnail);
    item.element.classList.add('thumbnail');
    filmstrip.insertBefore(item.element, filmstrip.firstElementChild);

    // If we have too many thumbnails now, remove the oldest one from
    // the array, and remove its element from the filmstrip and release
    // its blob url
    if (items.length > MAX_THUMBNAILS) {
      var oldest = items.pop();
      filmstrip.removeChild(oldest.element);
      URL.revokeObjectURL(oldest.element.src);
    }

    // Now update the index associated with each of the remaining elements
    // so that the click event handle knows which one it clicked on
    items.forEach(function(item, index) {
      item.element.dataset.index = index;
    });
  }

  // Remove all items from the filmstrip. Don't delete the files, but
  // forget all of our state. This also exits preview mode if we're in it.
  function clear() {
    if (!preview.classList.contains('offscreen'))
      returnToCameraMode();
    items.forEach(function(item) {
      filmstrip.removeChild(item.element);
      URL.revokeObjectURL(item.element.src);
    });
    items.length = 0;
  }

  // Create a thumbnail size canvas, copy the <img> or <video> into it
  // cropping the edges as needed to make it fit, and then extract the
  // thumbnail image as a blob and pass it to the callback.
  function createThumbnailFromElement(elt, video, rotation, callback) {
    // Create a thumbnail image
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    canvas.width = THUMBNAIL_WIDTH;
    canvas.height = THUMBNAIL_HEIGHT;
    var eltwidth = video ? elt.videoWidth : elt.width;
    var eltheight = video ? elt.videoHeight : elt.height;
    var scalex = canvas.width / eltwidth;
    var scaley = canvas.height / eltheight;

    // Take the larger of the two scales: we crop the image to the thumbnail
    var scale = Math.max(scalex, scaley);

    // Calculate the region of the image that will be copied to the
    // canvas to create the thumbnail
    var w = Math.round(THUMBNAIL_WIDTH / scale);
    var h = Math.round(THUMBNAIL_HEIGHT / scale);
    var x = Math.round((eltwidth - w) / 2);
    var y = Math.round((eltheight - h) / 2);

    // If a rotation is specified, rotate the canvas context
    if (rotation) {
      context.save();
      switch (rotation) {
      case 90:
        context.translate(THUMBNAIL_WIDTH, 0);
        context.rotate(Math.PI / 2);
        break;
      case 180:
        context.translate(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
        context.rotate(Math.PI);
        break;
      case 270:
        context.translate(0, THUMBNAIL_HEIGHT);
        context.rotate(-Math.PI / 2);
        break;
      }
    }

    // Draw that region of the image into the canvas, scaling it down
    context.drawImage(elt, x, y, w, h,
                      0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);

    // Restore the default rotation so the play arrow comes out correctly
    if (rotation) {
      context.restore();
    }

    // If this is a video, superimpose a translucent play button over
    // the captured video frame to distinguish it from a still photo thumbnail
    if (video) {
      // First draw a transparent gray circle
      context.fillStyle = 'rgba(0, 0, 0, .3)';
      context.beginPath();
      context.arc(THUMBNAIL_WIDTH / 2, THUMBNAIL_HEIGHT / 2,
                  THUMBNAIL_HEIGHT / 3, 0, 2 * Math.PI, false);
      context.fill();

      // Now outline the circle in white
      context.strokeStyle = 'rgba(255,255,255,.6)';
      context.lineWidth = 2;
      context.stroke();

      // And add a white play arrow.
      context.beginPath();
      context.fillStyle = 'rgba(255,255,255,.6)';
      // The height of an equilateral triangle is sqrt(3)/2 times the side
      var side = THUMBNAIL_HEIGHT / 3;
      var triangle_height = side * Math.sqrt(3) / 2;
      context.moveTo(THUMBNAIL_WIDTH / 2 + triangle_height * 2 / 3,
                     THUMBNAIL_HEIGHT / 2);
      context.lineTo(THUMBNAIL_WIDTH / 2 - triangle_height / 3,
                     THUMBNAIL_HEIGHT / 2 - side / 2);
      context.lineTo(THUMBNAIL_WIDTH / 2 - triangle_height / 3,
                     THUMBNAIL_HEIGHT / 2 + side / 2);
      context.closePath();
      context.fill();
    }

    canvas.toBlob(callback, 'image/jpeg');
  }

  function setOrientation(orientation) {
    preview.dataset.orientation = orientation;
    filmstrip.dataset.orientation = orientation;
    mediaFrame.dataset.orientation = orientation;

    // When we rotate the media frame, we also have to change its size
    var containerWidth = frameContainer.offsetWidth;
    var containerHeight = frameContainer.offsetHeight;
    if (orientation === 0 || orientation === 180) {
      mediaFrame.style.width = containerWidth + 'px';
      mediaFrame.style.height = containerHeight + 'px';
      mediaFrame.style.top = 0 + 'px';
      mediaFrame.style.left = 0 + 'px';
    }
    else {
      mediaFrame.style.width = containerHeight + 'px';
      mediaFrame.style.height = containerWidth + 'px';
      mediaFrame.style.top = ((containerHeight - containerWidth) / 2) + 'px';
      mediaFrame.style.left = ((containerWidth - containerHeight) / 2) + 'px';
    }

    // And rotate so this new size fills the screen
    mediaFrame.style.transform = 'rotate(-' + orientation + 'deg)';

    // And we have to resize the frame (and its video player)
    frame.resize();
    frame.video.setPlayerSize();
  }

  return {
    isShown: isShown,
    hide: hide,
    show: show,
    addImage: addImage,
    addVideo: addVideo,
    clear: clear,
    setOrientation: setOrientation
  };
}());
