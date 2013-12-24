define(function(require, exports, module) {
  'use strict';

  /**
   * Dependencies
   */

  var parseJPEGMetadata = require('jpegMetaDataParser');
  var addPanAndZoomHandlers = require('panzoom');
  var orientation = require('orientation');
  var constants = require('config/camera');
  var broadcast = require('broadcast');

  /**
   * Locals
   */

  var FILMSTRIP_DURATION = constants.FILMSTRIP_DURATION;

  module.exports = function(app) {
    var camera = app.camera;
    var ViewfinderView = app.views.viewfinder;

    // This array holds all the data we need for image and video previews
    var items = [];
    var currentItemIndex;

    var DEVICE_RATIO = window.devicePixelRatio;
    // Maximum number of thumbnails in the filmstrip
    var MAX_THUMBNAILS = 5;
    var THUMBNAIL_WIDTH = 46 * DEVICE_RATIO;  // size of each thumbnail
    var THUMBNAIL_HEIGHT = 46 * DEVICE_RATIO;

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
    cameraButton.onclick = hidePreview;
    deleteButton.onclick = deleteCurrentItem;
    shareButton.onclick = shareCurrentItem;
    mediaFrame.addEventListener('swipe', handleSwipe);
    broadcast.on('itemDeleted', onItemDeleted);
    broadcast.on('storageUnavailable', hidePreview);
    broadcast.on('storageShared', hidePreview);
    orientation.on('orientation', setOrientation);
    camera.state.on('change:recording', onRecordingChange);

    // Create the MediaFrame for previews
    var frame = new MediaFrame(mediaFrame);

    // Enable panning and zooming for images
    addPanAndZoomHandlers(frame);

    // Start off with it positioned correctly.
    setOrientation(orientation.get());

    // In secure mode, we never want the user to see the share button.
    // We also remove the delete button because we currently can't
    // display confirmation dialogs in the system app.
    if (app.inSecureMode) {
      shareButton.parentNode.removeChild(shareButton);
      deleteButton.parentNode.removeChild(deleteButton);
    }

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

      if (time) {
        hideTimer = setTimeout(hide, time);
      }
    }

    function toggle() {
      if (isShown()) {
        hide();
      } else {
        show();
      }
    }

    filmstrip.onclick = function(event) {
      var target = event.target;
      if (!target || !target.classList.contains('thumbnail')) {
        return;
      }

      var index = parseInt(target.dataset.index);
      previewItem(index);
      // If we're showing previews be sure we're showing the filmstrip
      // with no timeout and be sure that the viewfinder video is paused.
      show();
      ViewfinderView.el.pause();
    };

    function addVideoAndShow(data) {
      addVideo(
        data.filename,
        data.blob,
        data.poster.blob,
        data.width,
        data.height,
        data.rotation
      );

      show(FILMSTRIP_DURATION);
    }

    function addImageAndShow(path, blob) {
      addImage(path, blob);
      show(FILMSTRIP_DURATION);
    }

    function onItemDeleted(data) {
      deleteItem(data.path);
    }

    function onRecordingChange(isRecording) {

      // Hide the filmstrip to prevent the users from entering the
      // preview mode after Camera starts recording button pressed
      if (isRecording && isShown()) {
        hide();
      }
    }

    function previewItem(index) {
      // Don't redisplay the item if it is already displayed
      if (currentItemIndex === index) {
        return;
      }

      var item = items[index];

      if (item.isImage) {
        frame.displayImage(item.blob, item.width, item.height, item.preview,
                           item.rotation, item.mirrored);
      } else if (item.isVideo) {
        frame.displayVideo(item.blob, item.poster,
                           item.width, item.height,
                           item.rotation);
      }

      preview.classList.remove('offscreen');
      currentItemIndex = index;

      // Highlight the border of the thumbnail we're previewing
      // and clear the highlight on all others
      items.forEach(function(item, itemindex) {
        if (itemindex === index) {
          item.element.classList.add('previewed');
        } else {
          item.element.classList.remove('previewed');
        }
      });

      broadcast.emit('filmstripItemPreview');
    }

    function isPreviewShown() {
      return !preview.classList.contains('offscreen');
    }

    function hidePreview() {
      if (!isPreviewShown()) {
        return;
      }

      ViewfinderView.el.play(); // Restart the viewfinder
      show(FILMSTRIP_DURATION); // Fade the filmstrip after a delay
      preview.classList.add('offscreen');
      frame.clear();

      if (items.length > 0) {
        items[currentItemIndex].element.classList.remove('previewed');
      }

      currentItemIndex = null;
      broadcast.emit('filmstripPreviewHide');
     }

    function deleteCurrentItem() {
      // The button should be gone, but hard exit from this function
      // just in case.
      if (app.inSecureMode) {
        return;
      }

      var item = items[currentItemIndex];
      var msg, storage, filename;

      if (item.isImage) {
        msg = navigator.mozL10n.get('delete-photo?');
        storage = camera._pictureStorage;
        filename = item.filename;
      }
      else {
        msg = navigator.mozL10n.get('delete-video?');
        storage = camera._videoStorage;
        filename = item.filename;
      }

      if (confirm(msg)) {
        deleteItem(filename);
        // Actually delete the file
        storage.delete(filename).onerror = function(e) {
          console.warn('Failed to delete', filename,
                       'from DeviceStorage:', e.target.error);
        };

        // If this is a video file, delete its poster image as well
        if (item.isVideo) {
          var poster = filename.replace('.3gp', '.jpg');
          var pictureStorage = camera._pictureStorage;

          pictureStorage.delete(poster).onerror = function(e) {
            console.warn('Failed to delete poster image', poster,
                         'for video', filename, 'from DeviceStorage:',
                         e.target.error);
          };
        }

      }
    }

    function shareCurrentItem() {
      if (app.inSecureMode) {
        return;
      }

      var item = items[currentItemIndex];
      var type = item.isImage ? 'image/*' : 'video/*';
      var nameonly = item.filename.substring(
        item.filename.lastIndexOf('/') + 1);
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
          hidePreview();
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
        if (!metadata.rotation)
          metadata.rotation = 0;
        if (!metadata.mirrored)
          metadata.mirrored = false;

        if (metadata.preview) {
          var previewBlob = blob.slice(metadata.preview.start,
                                       metadata.preview.end,
                                       'image/jpeg');
          parseJPEGMetadata(previewBlob, function(thumbnailMetadata) {
            metadata.preview.width = thumbnailMetadata.width;
            metadata.preview.height = thumbnailMetadata.height;
            createThumbnail(
              previewBlob,
              false,
              metadata.rotation,
              metadata.mirrored,
              function(thumbnail) {
                addItem({
                  isImage: true,
                  filename: filename,
                  thumbnail: thumbnail,
                  blob: blob,
                  width: metadata.width,
                  height: metadata.height,
                  preview: metadata.preview,
                  rotation: metadata.rotation,
                  mirrored: metadata.mirrored
                });
            });
          });
        }
      }, function logerr(msg) { console.warn(msg); });
    }

    function addVideo(filename, blob, poster, width, height, rotation) {
      createThumbnail(poster, true, rotation, false,
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

    // Remove the filmstrip item with corresponding filename.
    function deleteItem(filename) {
      var deleteIdx = -1;
      var deletedItem = null;
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

      // find the item in items
      for (var n = 0; n < items.length; n++) {
        if (items[n].filename === deletedFileName) {
          deletedItem = items[n];
          deleteIdx = n;
          break;
        }
      }

      // Exit when item not found
      if (n === items.length) {
        return;
      }
      // Remove the item from the array of items
      items.splice(deleteIdx, 1);

      // Remove the thumbnail image from the filmstrip
      filmstrip.removeChild(deletedItem.element);
      URL.revokeObjectURL(deletedItem.element.src);
      deletedItem.element.src = '';

      // Renumber the item elements after the removed one
      for (var i = deleteIdx; i < items.length; i++) {
        items[i].element.dataset.index = i;
      }

      // if preview is shown, we need to handle no items and delete current item
      // case.
      if (isPreviewShown()) {
        // If there are no more items, go back to the camera
        if (items.length === 0) {
          hidePreview();
        } else if (currentItemIndex === deleteIdx) {
          // The delete item is current item,
          // switch the frame to display the next item.
          // But if we just deleted the last item, then we'll need to
          // display the previous item.
          var newindex = currentItemIndex;
          if (newindex >= items.length)
            newindex = items.length - 1;
          currentItemIndex = null;
          previewItem(newindex);
        }
      }
    }

    // Remove all items from the filmstrip. Don't delete the files, but
    // forget all of our state. This also exits preview mode if we're in it.
    function clear() {
      if (!preview.classList.contains('offscreen'))
        hidePreview();
      items.forEach(function(item) {
        filmstrip.removeChild(item.element);
        URL.revokeObjectURL(item.element.src);
      });
      items.length = 0;
    }

    // Create a thumbnail size canvas, copy the <img> or <video> into it
    // cropping the edges as needed to make it fit, and then extract the
    // thumbnail image as a blob and pass it to the callback.
    function createThumbnail(imageBlob, video, rotation, mirrored, callback)
    {
      offscreenImage.src = URL.createObjectURL(imageBlob);
      offscreenImage.onload = function() {
        // Create a thumbnail image
        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');
        canvas.width = THUMBNAIL_WIDTH;
        canvas.height = THUMBNAIL_HEIGHT;
        var imgWidth = offscreenImage.width;
        var imgHeight = offscreenImage.height;
        var scalex = canvas.width / imgWidth;
        var scaley = canvas.height / imgHeight;

        // Take the larger of the two scales: we crop the image to the thumbnail
        var scale = Math.max(scalex, scaley);

        // Calculate the region of the image that will be copied to the
        // canvas to create the thumbnail
        var w = Math.round(THUMBNAIL_WIDTH / scale);
        var h = Math.round(THUMBNAIL_HEIGHT / scale);
        var x = Math.round((imgWidth - w) / 2);
        var y = Math.round((imgHeight - h) / 2);

        var centerX = Math.floor(THUMBNAIL_WIDTH / 2);
        var centerY = Math.floor(THUMBNAIL_HEIGHT / 2);

        // If a orientation is specified, rotate/mirroring the canvas context.
        if (rotation || mirrored) {
          context.save();
          // All transformation are applied to the center of the thumbnail.
          context.translate(centerX, centerY);
        }

        if (mirrored) {
          context.scale(-1, 1);
        }
        if (rotation) {
          switch (rotation) {
          case 90:
            context.rotate(Math.PI / 2);
            break;
          case 180:
            context.rotate(Math.PI);
            break;
          case 270:
            context.rotate(-Math.PI / 2);
            break;
          }
        }

        if (rotation || mirrored) {
          context.translate(-centerX, -centerY);
        }

        // Draw that region of the image into the canvas, scaling it down
        context.drawImage(offscreenImage, x, y, w, h,
                          0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);

        // Restore the default rotation so the play arrow comes out correctly
        if (rotation || mirrored) {
          context.restore();
        }

        // We're done with the offscreen image now
        URL.revokeObjectURL(offscreenImage.src);
        offscreenImage.onload = null;
        offscreenImage.src = '';

        if (video) {
          // Superimpose a translucent play button over
          // the thumbnail to distinguish it from a still photo
          // thumbnail. First draw a transparent gray circle.
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

    var Filmstrip = {
      isShown: isShown,
      hide: hide,
      show: show,
      toggle: toggle,
      addImage: addImage,
      addVideo: addVideo,
      deleteItem: deleteItem,
      clear: clear,
      hidePreview: hidePreview,
      isPreviewShown: isPreviewShown,
      addImageAndShow: addImageAndShow,
      addVideoAndShow: addVideoAndShow
    };

    // camera.js needs this to be global
    window.Filmstrip = Filmstrip;
    return Filmstrip;
  };
});
