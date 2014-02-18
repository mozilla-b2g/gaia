define(function(require, exports, module) {
/*global CONFIG_REQUIRED_EXIF_PREVIEW_WIDTH */
/*global CONFIG_REQUIRED_EXIF_PREVIEW_HEIGHT */

  'use strict';

  /**
   * NOTE:
   *
   * This module has not been refactored
   * along with the rest of the code base
   * as it is unlikely to be a feature of
   * future versions.
   *
   * We have shoehorned it into the refactor,
   * but are expecting it to be deprecated in
   * favor of new functionality.
   */

  /**
   * Dependencies
   */

  var parseJPEGMetadata = require('jpegMetaDataParser');
  var addPanAndZoomHandlers = require('lib/panzoom');
  var orientation = require('lib/orientation');
  var debug = require('debug')('filmstrip');
  var constants = require('config/camera');
  var broadcast = require('lib/broadcast');
  var MediaFrame = require('MediaFrame');
  var createThumbnailImage = require('lib/create-thumbnail-image');

  /**
   * Locals
   */

  var FILMSTRIP_DURATION = constants.FILMSTRIP_DURATION;

  module.exports = function(app) {
    debug('initializing');
    var camera = app.camera;
    var storage = app.storage;
    var ViewfinderView = app.views.viewfinder;

    // This array holds all the data we need for image and video previews
    var items = [];
    var currentItemIndex;

    // Maximum number of thumbnails in the filmstrip
    var MAX_THUMBNAILS = 5;
    var DEVICE_RATIO = window.devicePixelRatio;
    var THUMBNAIL_WIDTH = 46 * DEVICE_RATIO;
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
    debug('fetched elements');

    // Set up event handlers
    cameraButton.onclick = hidePreview;
    deleteButton.onclick = deleteCurrentItem;
    shareButton.onclick = shareCurrentItem;
    mediaFrame.addEventListener('swipe', handleSwipe);
    storage.on('itemdeleted', onItemDeleted);
    broadcast.on('storageUnavailable', hidePreview);
    broadcast.on('storageShared', hidePreview);
    orientation.on('orientation', setOrientation);
    camera.on('change:recording', onRecordingChange);

    // bug/952164: 'click's on certain parts of
    // the preview element can trigger a 'click'
    // event on the capture button. Setting an event
    // listener seems to prevent this behaviour :-/
    preview.onclick = function() {};

    // Create the MediaFrame for previews
    var frame = new MediaFrame(mediaFrame);
    if (CONFIG_REQUIRED_EXIF_PREVIEW_WIDTH) {
      frame.setMinimumPreviewSize(CONFIG_REQUIRED_EXIF_PREVIEW_WIDTH,
                                  CONFIG_REQUIRED_EXIF_PREVIEW_HEIGHT);
    }

    // Enable panning and zooming for images
    addPanAndZoomHandlers(frame);

    debug('setup MediaFrame');

    // Start off with it positioned correctly.
    setOrientation(orientation.get());
    debug('set orientation');

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
      ViewfinderView.els.video.pause();
    };

    function addVideoAndShow(video) {
      addVideo(video);
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
        frame.displayVideo(item.blob, item.poster.blob,
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

      ViewfinderView.els.video.play(); // Restart the viewfinder
      show(FILMSTRIP_DURATION); // Fade the filmstrip after a delay
      preview.classList.add('offscreen');
      frame.clear();

      if (items.length > 0) {
        items[currentItemIndex].element.classList.remove('previewed');
      }

      currentItemIndex = null;
      broadcast.emit('filmstripPreviewHide');
     }

    // TODO: Update this when new storage is in place
    function deleteCurrentItem() {
      // The button should be gone, but hard exit from this function
      // just in case.
      if (app.inSecureMode) {
        return;
      }

      var item = items[currentItemIndex];
      var msg, _storage, filepath;

      if (item.isImage) {
        msg = navigator.mozL10n.get('delete-photo?');
        _storage = storage.image;
        filepath = item.filepath;
      }
      else {
        msg = navigator.mozL10n.get('delete-video?');
        _storage = storage.video;
        filepath = item.filepath;
      }

      if (confirm(msg)) {
        deleteItem(filepath);
        // Actually delete the file
        _storage.delete(filepath).onerror = function(e) {
          console.warn('Failed to delete', filepath,
                       'from DeviceStorage:', e.target.error);
        };

        // If this is a video file, delete its poster image as well
        if (item.isVideo) {
          var poster = filepath.replace('.3gp', '.jpg');
          var pictureStorage = storage.image;

          pictureStorage.delete(poster).onerror = function(e) {
            console.warn('Failed to delete poster image', poster,
                         'for video', filepath, 'from DeviceStorage:',
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
      var nameonly = item.filepath.substring(
        item.filepath.lastIndexOf('/') + 1);
      var activity = new window.MozActivity({
        name: 'share',
        data: {
          type: type,
          number: 1,
          blobs: [item.blob],
          filenames: [nameonly],
          filepaths: [item.filepath] /* temporary hack for bluetooth app */
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
        if (e.detail.vy < -1) { hidePreview(); }
        break;
      case 'left': // go to next image if fast enough
        if (e.detail.vx < -1 && currentItemIndex < items.length - 1) {
          previewItem(currentItemIndex + 1); }
        break;
      case 'right': // go to previous image if fast enough
        if (e.detail.vx > 1 && currentItemIndex > 0) {
          previewItem(currentItemIndex - 1); }
        break;
      }
    }

    function addImage(filepath, blob) {
      parseJPEGMetadata(blob, function getPreviewBlob(metadata) {
        if (!metadata.rotation) { metadata.rotation = 0; }
        if (!metadata.mirrored) { metadata.mirrored = false; }

        if (metadata.preview) {
          var previewBlob = blob.slice(metadata.preview.start,
                                       metadata.preview.end,
                                       'image/jpeg');
          parseJPEGMetadata(previewBlob, function(thumbnailMetadata) {
            metadata.preview.width = thumbnailMetadata.width;
            metadata.preview.height = thumbnailMetadata.height;
            createThumbnailImage(
              previewBlob,
              THUMBNAIL_WIDTH,
              THUMBNAIL_HEIGHT,
              false,
              metadata.rotation,
              metadata.mirrored,
              function(thumbnail) {
                addItem({
                  isImage: true,
                  filepath: filepath,
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

    function addVideo(video) {

      createThumbnailImage(
        video.poster.blob,
        THUMBNAIL_WIDTH,
        THUMBNAIL_HEIGHT,
        true,
        video.rotation,
        false,
        function(thumbnail) {
          video.thumbnail = thumbnail;
          addItem(video);
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

    // Remove the filmstrip item with corresponding filepath.
    function deleteItem(filepath) {
      var deleteIdx = -1;
      var deletedItem = null;
      var deletedFileName;
      // Check whether filepath is a video poster image or not. If filepath
      // contains 'VID' and ends with '.jpg', consider it a video poster
      // image and get the video filepath by changing '.jpg' to '.3gp'
      if (filepath.indexOf('VID') != -1 &&
          filepath.lastIndexOf('.jpg') === filepath.length - 4) {
        deletedFileName = filepath.replace('.jpg', '.3gp');
      } else {
        deletedFileName = filepath;
      }

      // find the item in items
      for (var n = 0; n < items.length; n++) {
        if (items[n].filepath === deletedFileName) {
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
          if (newindex >= items.length) { newindex = items.length - 1; }
          currentItemIndex = null;
          previewItem(newindex);
        }
      }
    }

    // Remove all items from the filmstrip. Don't delete the files, but
    // forget all of our state. This also exits preview mode if we're in it.
    function clear() {
      if (!preview.classList.contains('offscreen')) { hidePreview(); }
      items.forEach(function(item) {
        filmstrip.removeChild(item.element);
        URL.revokeObjectURL(item.element.src);
      });
      items.length = 0;
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
    debug('initialized');

    return Filmstrip;
  };
});
