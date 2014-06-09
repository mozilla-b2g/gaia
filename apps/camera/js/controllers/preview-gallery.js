define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var createThumbnailImage = require('lib/create-thumbnail-image');
var debug = require('debug')('controller:preview-gallery');
var PreviewGalleryView = require('views/preview-gallery');
var preparePreview = require('lib/prepare-preview-blob');
var resizeImageAndSave = require('lib/resize-image-and-save');
var StringUtils = require('lib/string-utils');
var bindAll = require('lib/bind-all');
var dialog = require('CustomDialog');

/**
 * Exports
 */

module.exports = function(app) { return new PreviewGalleryController(app); };
module.exports.PreviewGalleryController = PreviewGalleryController;

function PreviewGalleryController(app) {
  debug('initializing');
  bindAll(this);
  this.app = app;
  this.settings = app.settings;
  this.dialog = app.dialog || dialog; // test hook
  this.resizeImageAndSave = resizeImageAndSave;
  this.bindEvents();
  this.configure();
  debug('initialized');
}

PreviewGalleryController.prototype.bindEvents = function() {
  this.app.on('storage:itemdeleted', this.onItemDeleted);
  this.app.on('preview', this.openPreview);
  this.app.on('newmedia', this.onNewMedia);
  this.app.on('hidden', this.onHidden);
  debug('events bound');
};

PreviewGalleryController.prototype.configure = function() {
  this.currentItemIndex = 0;
  this.items = [];            // All the pictures and videos we know about
  this.thumbnailItem = null;  // The item that currently has a thumbnail

  var dpr = window.devicePixelRatio;
  this.thumbnailSize = {
    width: this.settings.previewGallery.get('thumbnailWidth') * dpr,
    height: this.settings.previewGallery.get('thumbnailHeight') * dpr
  };
};

PreviewGalleryController.prototype.openPreview = function() {
  // If we're handling a pick activity the preview gallery is not used
  if (this.app.activity.pick) {
    return;
  }

  if (this.view) {
    return;
  }

  // Check whether the MediaFrame should limit the pixel size.
  var maxPreviewSize =
    this.settings.previewGallery.get('limitMaxPreviewSize') ?
    window.CONFIG_MAX_IMAGE_PIXEL_SIZE : 0;

  this.view = new PreviewGalleryView();
  this.view.maxPreviewSize = maxPreviewSize;
  this.view.render().appendTo(this.app.el);

  this.view.on('click:gallery', this.onGalleryButtonClick);
  this.view.on('click:share', this.shareCurrentItem);
  this.view.on('click:delete', this.deleteCurrentItem);
  this.view.on('click:back', this.closePreview);
  this.view.on('swipe', this.handleSwipe);
  this.view.on('click:options', this.onOptionsClick);

  // If lockscreen is locked, hide all control buttons
  var secureMode = this.app.inSecureMode;
  this.view.set('secure-mode', secureMode);
  this.view.open();

  this.app.set('previewGalleryOpen', true);
  this.previewItem();
  this.app.emit('previewgallery:opened');
};

PreviewGalleryController.prototype.closePreview = function() {
  // If the item that we have displayed a thumbnail for is no longer the
  // first item in the array of items, then update the thumbnail. This can
  // happen if the user deletes items after previewing them.
  if (this.thumbnailItem !== this.items[0]) {
    this.updateThumbnail();
  }

  if (this.view) {
    this.currentItemIndex = 0;
    this.view.close();
    this.view.destroy();
    this.view = null;
  }

  this.app.set('previewGalleryOpen', false);
  this.app.emit('previewgallery:closed');
};

/**
 * Open the gallery app when the
 * gallery button is pressed.
 *
 * @private
 */
PreviewGalleryController.prototype.onGalleryButtonClick = function() {
  // Can't launch the gallery if the lockscreen is locked.
  // The button shouldn't even be visible in this case, but
  // let's be really sure here.
  if (this.app.inSecureMode) {
    return;
  }

  var MozActivity = window.MozActivity;

  // Launch the gallery with an activity
  this.mozActivity = new MozActivity({
    name: 'browse',
    data: { type: 'photos' }
  });
};

PreviewGalleryController.prototype.onOptionsClick = function() {
  if (this.app.inSecureMode) {
    return;
  }

  this.view.showOptionsMenu();
};


PreviewGalleryController.prototype.shareCurrentItem = function() {
  if (this.app.inSecureMode) {
    return;
  }

  var index = this.currentItemIndex;
  var item = this.items[index];
  var type = item.isVideo ? 'video/*' : 'image/*';
  var filename = StringUtils.lastPathComponent(item.filepath);

  var launchShareActivity = function(blob) {
    var activity = new window.MozActivity({
      name: 'share',
      data: {
        type: type,
        number: 1,
        blobs: [blob],
        filenames: [filename],
        filepaths: [item.filepath] /* temporary hack for bluetooth app */
      }
    });
    activity.onerror = function(e) {
      console.warn('Share activity error:', activity.error.name);
    };
  };

  if (item.isVideo) {
    launchShareActivity(item.blob);
    return;
  }

  var self = this;

  this.stopItemDeletedEvent = true;

  // Resize the image to the maximum pixel size for share activities.
  // If no maximum is specified (value is `0`), then simply rotate
  // (if needed) and re-save the image prior to launching the activity.
  this.resizeImageAndSave({
    blob: item.blob,
    size: this.settings.activity.get('maxSharePixelSize')
  }, function(resizedBlob) {
    self.stopItemDeletedEvent = false;
    launchShareActivity(resizedBlob);
  });
};

/**
 * Delete the current item
 * when the delete button is pressed.
 *
 * @private
 */
PreviewGalleryController.prototype.deleteCurrentItem = function() {
  // The button should be gone,but
  // hard exit from this function just in case.
  if (this.app.inSecureMode) { return; }

  var index = this.currentItemIndex;
  var item = this.items[index];
  var filepath = item.filepath;
  var dialog = this.dialog;
  var self = this;
  var msg;

  if (item.isVideo) {
    msg = navigator.mozL10n.get('delete-video?');
  }
  else {
    msg = navigator.mozL10n.get('delete-photo?');
  }

  dialog.show('', msg, {
      title: navigator.mozL10n.get('cancel'),
      callback: closeDialog
    }, {
      title: navigator.mozL10n.get('delete'),
      callback: deleteItem,
      recommend: false
    });

  function closeDialog() {
    dialog.hide();
  }

  function deleteItem() {
    dialog.hide();

    self.updatePreviewGallery(index);

    // Actually delete the file
    if (item.isVideo) {
      self.app.emit('previewgallery:deletevideo', filepath);
    } else {
      self.app.emit('previewgallery:deletepicture', filepath);
    }
  }
};

/**
 * Update the preview with the latest recent item
 * after deleting images/videos.
 *
 * @param  {String} index
 */
PreviewGalleryController.prototype.updatePreviewGallery = function(index) {
  // Remove the item from the array of items
  this.items.splice(index, 1);

    // If there are no more items, go back to the camera
  if (this.items.length === 0) {
    this.closePreview();
  }
  else {
    if (index == this.items.length) {
      this.currentItemIndex = this.items.length - 1;
    }

    var isOpened = this.view ? true : false;
    if (isOpened) {
      this.previewItem();
    }
  }
};

/**
 * To Do: Image Swipe Transition
 */
PreviewGalleryController.prototype.handleSwipe = function(direction) {
  if (direction === 'left') {
    this.next();
  }
  else if (direction === 'right') {
    this.previous();
  }
};

PreviewGalleryController.prototype.next = function() {
  if (this.currentItemIndex < this.items.length - 1) {
    this.currentItemIndex += 1;
    this.previewItem();
  }
};

PreviewGalleryController.prototype.previous = function() {
  if (this.currentItemIndex > 0) {
    this.currentItemIndex -= 1;
    this.previewItem();
  }
};

PreviewGalleryController.prototype.onNewMedia = function(item) {
  // If we're handling a pick activity the preview gallery is not used
  if (this.app.activity.pick) {
    return;
  }

  var self = this;

  if (item.isVideo) {
    // If the new media is video, use it as-is
    addNewMedia(item);
  } else {
    // If it is a photo, find its EXIF preview first
    preparePreview(item.blob, function(metadata) {
      metadata.blob = item.blob;
      metadata.filepath = item.filepath;
      addNewMedia(metadata);
    });
  }

  function addNewMedia(item) {
    self.items.unshift(item);
    self.updateThumbnail();
  }
};

PreviewGalleryController.prototype.previewItem = function() {
  var index = this.currentItemIndex;
  var item = this.items[index];
  this.view.updateCountText(index + 1, this.items.length);

  if (item.isVideo) {
    this.view.showVideo(item);
  } else {
    this.view.showImage(item);
  }
};

/**
 * Delete and update items in the preview gallery
 * when images/videos are deleted by others
 *
 * @param  {Object} filepath
 */
PreviewGalleryController.prototype.onItemDeleted = function(data) {
  
  // Check if this event is being stopped such as in the case
  // of resizing an image for a share activity.
  if (this.stopItemDeletedEvent) {
    return;
  }

  var deleteIdx = -1;
  var deletedFilepath = data.path;

  // find the item in items
  for (var n = 0; n < this.items.length; n++) {
    if (this.items[n].filepath === deletedFilepath) {
      deleteIdx = n;
      break;
    }
  }

  // Exit when item not found
  if (n === this.items.length) { return; }

  this.updatePreviewGallery(deleteIdx);
};

/**
 * As a privacy feature, when the camera app is used from the lockscreen
 * and the lockscreen is actually locked with a passcode, we don't want
 * the camera to retain any state from one use to the next. So if the
 * camera is hidden (i.e. if the phone returns to the lockscreen) we
 * forget our state.  In practice, it appears that the system app actually
 * kills the camera when this happens, so this code is redundant.
 */
PreviewGalleryController.prototype.onHidden = function() {
  if (this.app.inSecureMode) {
    this.configure();          // Forget all stored images
    this.updateThumbnail();    // Get rid of any thumbnail
  }
  this.closePreview();
};

PreviewGalleryController.prototype.updateThumbnail = function() {
  var self = this;
  var media = this.thumbnailItem = this.items[0] || null;
  var blob;

  if (media === null) {
    this.app.emit('newthumbnail', null);
    return;
  }

  if (media.isVideo) {

    // If it is a video we can create a thumbnail from the poster image
    blob = media.poster.blob;
  } else {

    // If it is a photo we want to use the EXIF preview rather than
    // decoding the whole image if we can.
    if (media.preview) {

      // The Tarako may produce EXIF previews that have the wrong
      // aspect ratio and are distorted. Check for that, and if the
      // aspect ratio is not right, then create a thumbnail from the
      // full size image
      var fullRatio = media.width / media.height;
      var previewRatio = media.preview.width / media.preview.height;

      // If aspect ratios match, create thumbnail from EXIF preview
      if (Math.abs(fullRatio - previewRatio) < 0.01) {
        blob = media.blob.slice(media.preview.start, media.preview.end,
                                'image/jpeg');
      }
    }

    // If a thumbnail couldn't be obtained from the EXIF preview,
    // use the full image
    if (!blob) {
      blob = media.blob;
    }
  }

  createThumbnailImage(blob, media, this.thumbnailSize, gotThumbnail);

  function gotThumbnail(blob) {
    self.app.emit('newthumbnail', blob);
  }
};

});
