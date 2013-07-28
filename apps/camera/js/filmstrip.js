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

  // Offscreen image for generating thumbnails
  var offscreenImage = new Image();

  // Set up event handlers
  cameraButton.onclick = returnToCameraMode;
  deleteButton.onclick = deleteCurrentItem;
  shareButton.onclick = shareCurrentItem;
  mediaFrame.addEventListener('swipe', handleSwipe);

  // Create the MediaFrame for previews
  var frame = new MediaFrame(mediaFrame);

  // Enable panning and zooming for images
  addPanAndZoomHandlers(frame);

  // Start off with it positioned correctly.
  setOrientation(Camera._phoneOrientation);

  // In secure mode, we never want the user to see the share button.
  if (Camera._secureMode)
    shareButton.parentNode.removeChild(shareButton);

  function isShown() {
    return !document.body.classList.contains('filmstriphidden');
  }

  function hide() {
    document.body.classList.add('filmstriphidden');
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
    document.body.classList.remove('filmstriphidden');
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
  };

  function previewItem(index) {
    Camera.resetReturnToCamera();
    Camera.screenTimeout();
    // Don't redisplay the item if it is already displayed
    if (currentItemIndex === index)
      return;

    var item = items[index];

    if (item.isImage) {
      frame.displayImage(item.blob, item.width, item.height, item.preview);
    }
    else if (item.isVideo) {
      frame.displayVideo(item.blob, item.poster,
                         item.width, item.height,
                         item.rotation);
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
    Camera.setReturnToCamera();
    Camera.screenWakeLock();
    Camera.viewfinder.play();        // Restart the viewfinder
    show(Camera.FILMSTRIP_DURATION); // Fade the filmstrip after a delay
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
      item.element.src = '';

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
      };

      // If this is a video file, delete its poster image as well
      if (item.isVideo) {
        var poster = filename.replace('.3gp', '.jpg');
        var pictureStorage = Camera._pictureStorage;

        pictureStorage.delete(poster).onerror = function(e) {
          console.warn('Failed to delete poster image', poster,
                       'for video', filename, 'from DeviceStorage:',
                       e.target.error);
        };
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
    };
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
          createThumbnailFromImage(offscreenImage, function(thumbnail) {
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

  function addVideo(filename, blob, poster, width, height, rotation) {
    createThumbnailFromPoster(poster, width, height, rotation,
                              function(thumbnail) {
                                addItem({
                                  isVideo: true,
                                  filename: filename,
                                  thumbnail: thumbnail,
                                  poster: poster,
                                  blob: blob,
                                  width: width,
                                  height: height,
                                  rotation: rotation
                                });
                              });
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

  // Remove the filmstrip item with correspondent filename. If filename is
  // a video poster image, remove the filmstrip item of its video file.
  function deleteItem(filename) {
    var deletedFileName;

    // Check whether filename is a video poster image or not. If filename
    // contains 'VID' and ends with '.jpg', consider it a video poster
    // image and get the video filename by changing '.jpg' to '.3gp'
    if (filename.indexOf('VID') != -1 &&
        filename.lastIndexOf('.jpg') === filename.length - 4) {
      deletedFileName = filename.replace('.jpg', '.3gp');
    } else {
      deletedFileName = filename;
    }

    // Remove the item in filmstrip
    for (var n = 0; n < items.length; n++) {
      if (items[n].filename === deletedFileName) {
        var item = items[n];

        // Remove the item from the array of items
        items.splice(n, 1);

        // Remove the thumbnail image from the filmstrip
        filmstrip.removeChild(item.element);
        URL.revokeObjectURL(item.element.src);
        item.element.src = '';

        break;
      }
    }

    // Renumber the item elements after the removed one
    for (var i = n; i < items.length; i++) {
      items[i].element.dataset.index = i;
    }
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
  function createThumbnailFromImage(img, callback) {
    // Create a thumbnail image
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    canvas.width = THUMBNAIL_WIDTH;
    canvas.height = THUMBNAIL_HEIGHT;
    var imgwidth = img.width;
    var imgheight = img.height;
    var scalex = canvas.width / imgwidth;
    var scaley = canvas.height / imgheight;

    // Take the larger of the two scales: we crop the image to the thumbnail
    var scale = Math.max(scalex, scaley);

    // Calculate the region of the image that will be copied to the
    // canvas to create the thumbnail
    var w = Math.round(THUMBNAIL_WIDTH / scale);
    var h = Math.round(THUMBNAIL_HEIGHT / scale);
    var x = Math.round((imgwidth - w) / 2);
    var y = Math.round((imgheight - h) / 2);

    // Draw that region of the image into the canvas, scaling it down
    context.drawImage(img, x, y, w, h,
                      0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);

    canvas.toBlob(callback, 'image/jpeg');
  }

  // Create a thumbnail size canvas, copy the <img> or <video> into it
  // cropping the edges as needed to make it fit, and then extract the
  // thumbnail image as a blob and pass it to the callback.
  function createThumbnailFromPoster(poster, width, height, rotation, callback)
  {
    // Load the poster image into an offscreen image
    offscreenImage.src = URL.createObjectURL(poster);
    // And when it loads, create a thumbnail from it
    offscreenImage.onload = function() {

      // Now create a thumbnail
      var thumbnailcanvas = document.createElement('canvas');
      var thumbnailcontext = thumbnailcanvas.getContext('2d');
      thumbnailcanvas.width = THUMBNAIL_WIDTH;
      thumbnailcanvas.height = THUMBNAIL_HEIGHT;

      var scalex = THUMBNAIL_WIDTH / width;
      var scaley = THUMBNAIL_HEIGHT / height;

      // Take the larger of the two scales: we crop the image to the thumbnail
      var scale = Math.max(scalex, scaley);

      // Calculate the region of the image that will be copied to the
      // canvas to create the thumbnail
      var w = Math.round(THUMBNAIL_WIDTH / scale);
      var h = Math.round(THUMBNAIL_HEIGHT / scale);
      var x = Math.round((width - w) / 2);
      var y = Math.round((height - h) / 2);

      // If a rotation is specified, rotate the canvas context
      if (rotation) {
        thumbnailcontext.save();
        switch (rotation) {
        case 90:
          thumbnailcontext.translate(THUMBNAIL_WIDTH, 0);
          thumbnailcontext.rotate(Math.PI / 2);
          break;
        case 180:
          thumbnailcontext.translate(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
          thumbnailcontext.rotate(Math.PI);
          break;
        case 270:
          thumbnailcontext.translate(0, THUMBNAIL_HEIGHT);
          thumbnailcontext.rotate(-Math.PI / 2);
          break;
        }
      }

      // Draw that region of the poster into the thumbnail, scaling it down
      thumbnailcontext.drawImage(offscreenImage, x, y, w, h,
                                 0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);

      // We're done with the offscreen image now
      URL.revokeObjectURL(offscreenImage.src);
      offscreenImage.onload = null;
      offscreenImage.src = null;

      // Restore the default rotation so the play arrow comes out correctly
      if (rotation) {
        thumbnailcontext.restore();
      }

      // Superimpose a translucent play button over
      // the thumbnail to distinguish it from a still photo
      // thumbnail. First draw a transparent gray circle.
      thumbnailcontext.fillStyle = 'rgba(0, 0, 0, .3)';
      thumbnailcontext.beginPath();
      thumbnailcontext.arc(THUMBNAIL_WIDTH / 2, THUMBNAIL_HEIGHT / 2,
                           THUMBNAIL_HEIGHT / 3, 0, 2 * Math.PI, false);
      thumbnailcontext.fill();

      // Now outline the circle in white
      thumbnailcontext.strokeStyle = 'rgba(255,255,255,.6)';
      thumbnailcontext.lineWidth = 2;
      thumbnailcontext.stroke();

      // And add a white play arrow.
      thumbnailcontext.beginPath();
      thumbnailcontext.fillStyle = 'rgba(255,255,255,.6)';
      // The height of an equilateral triangle is sqrt(3)/2 times the side
      var side = THUMBNAIL_HEIGHT / 3;
      var triangle_height = side * Math.sqrt(3) / 2;
      thumbnailcontext.moveTo(THUMBNAIL_WIDTH / 2 + triangle_height * 2 / 3,
                              THUMBNAIL_HEIGHT / 2);
      thumbnailcontext.lineTo(THUMBNAIL_WIDTH / 2 - triangle_height / 3,
                              THUMBNAIL_HEIGHT / 2 - side / 2);
      thumbnailcontext.lineTo(THUMBNAIL_WIDTH / 2 - triangle_height / 3,
                              THUMBNAIL_HEIGHT / 2 + side / 2);
      thumbnailcontext.closePath();
      thumbnailcontext.fill();

      // Get the thumbnail image as a blob and pass it to the callback
      thumbnailcanvas.toBlob(callback, 'image/jpeg');
    };
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

    // And inform the video player of new orientation
    frame.video.setPlayerOrientation(orientation);
  }

  return {
    isShown: isShown,
    hide: hide,
    show: show,
    addImage: addImage,
    addVideo: addVideo,
    deleteItem: deleteItem,
    clear: clear,
    setOrientation: setOrientation
  };
}());
