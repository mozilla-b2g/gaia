define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('controller:preview-gallery');
var bindAll = require('lib/bind-all');
var PreviewGalleryView = require('views/preview-gallery');
var parseJPEGMetadata = require('jpegMetaDataParser');
var createThumbnailImage = require('lib/create-thumbnail-image');

/**
 * The size of the thumbnail images we generate.
 *
 * XXX: these constants are linked to style/controls.css, and should
 * probably be defined somewhere else in the app.
 */
var THUMBNAIL_WIDTH = 54 * window.devicePixelRatio;
var THUMBNAIL_HEIGHT = 54 * window.devicePixelRatio;

/**
 * Exports
 */

exports = module.exports = function(app) {
  return new PreviewGalleryController(app);
};
module.exports.PreviewGalleryController = PreviewGalleryController;

function PreviewGalleryController(app) {
  debug('initializing');
  bindAll(this);
  this.app = app;
  this.storage = this.app.storage;
  this.bindEvents();
  this.configure();
  debug('initialized');
}

PreviewGalleryController.prototype.bindEvents = function() {
  this.app.on('preview', this.openPreview);
  this.app.on('newmedia', this.onNewMedia);
  this.app.on('blur', this.onBlur);

  this.storage.on('itemdeleted', this.onItemDeleted);

  debug('events bound');
};

PreviewGalleryController.prototype.configure = function() {
  this.currentItemIndex = 0;
  this.items = [];            // All the pictures and videos we know about
  this.thumbnailItem = null;  // The item that currently has a thumbnail
};

PreviewGalleryController.prototype.openPreview = function() {
  // If we're handling a pick activity the preview gallery is not used
  if (this.app.activity.active) {
    return;
  }

  if (this.view) { return; }
  this.view = new PreviewGalleryView()
    .render()
    .appendTo(this.app.el);

  this.view.on('click:gallery', this.onGalleryButtonClick);
  this.view.on('click:share', this.shareCurrentItem);
  this.view.on('click:delete', this.deleteCurrentItem);
  this.view.on('click:back', this.closePreview);
  this.view.on('itemChange', this.handleItemChange);

  // If lockscreen is locked, hide all control buttons
  var secureMode = this.app.inSecureMode;
  this.view.set('secure-mode', secureMode);
  this.view.open();

  this.previewItem();
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
  if (this.app.inSecureMode) { return; }
  
  var MozActivity = window.MozActivity;

  // Launch the gallery with an activity
  this.mozActivity = new MozActivity({
    name: 'browse',
    data: { type: 'photos' }
  });
};

PreviewGalleryController.prototype.shareCurrentItem = function() {
  if (this.app.inSecureMode) { return; }

  var index = this.currentItemIndex;
  var item = this.items[index];
  var type = item.isVideo ? 'video/*' : 'image/*';
  var filename = item.filepath.substring(
    item.filepath.lastIndexOf('/') + 1);
  var activity = new window.MozActivity({
    name: 'share',
    data: {
      type: type,
      number: 1,
      blobs: [item.blob],
      filenames: [filename],
      filepaths: [item.filepath] /* temporary hack for bluetooth app */
    }
  });
  activity.onerror = function(e) {
    console.warn('Share activity error:', activity.error.name);
  };
};

/**
 * Delete the current item 
 * when the delete button is pressed.
 * @private
 */
PreviewGalleryController.prototype.deleteCurrentItem = function() {
  // The button should be gone, but hard exit from this function
  // just in case.
  if (this.app.inSecureMode) { return; }

  var index = this.currentItemIndex;
  var item = this.items[index];
  var filepath = item.filepath;
  var msg;

  if (item.isVideo) {
    msg = navigator.mozL10n.get('delete-video?');
  }
  else {
    msg = navigator.mozL10n.get('delete-photo?');
  }

  if (window.confirm(msg)) {
    this.updatePreviewGallery(index);

    // Actually delete the file
    if (item.isVideo) {
      this.storage.deleteVideo(filepath);
    } else {
      this.storage.deleteImage(filepath);
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

    var isPreviewOpened = this.view.isPreviewOpened();
    if (isPreviewOpened) {
      this.previewItem();
    }
  }
};

/**
 * To Do: Image Swipe Transition
 */
PreviewGalleryController.prototype.handleItemChange = function(e) {
  var direction = e.detail.direction;
  switch (direction) {
  case 'left': // go to next image
    this.next();
    break;
  case 'right': // go to previous
    this.previous();
    break;
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
  if (this.app.activity.active) {
    return;
  }

  this.items.unshift(item);
  this.updateThumbnail();
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

  this.app.emit('previewgallery:opened');
};

/**
 * Delete and update items in the preview gallery
 * when images/videos are deleted by others
 *
 * @param  {Object} filepath
 */
PreviewGalleryController.prototype.onItemDeleted = function(data) {
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
PreviewGalleryController.prototype.onBlur = function() {
  if (this.app.inSecureMode) {
    this.closePreview();
    this.configure();          // Forget all stored images
    this.updateThumbnail();    // Get rid of any thumbnail
  }
};

PreviewGalleryController.prototype.updateThumbnail = function() {
  var self = this;
  var media = this.thumbnailItem = this.items[0] || null;

  if (media === null) {
    this.app.emit('newthumbnail', null);
    return;
  }

  if (media.isVideo) {
    // If it is a video we can create a thumbnail from the poster image
    createThumbnailImage(media.poster.blob, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT,
                         media.rotation, media.mirrored, gotThumbnail);
  } else {
    // If it is a photo we want to use the EXIF preview rather than
    // decoding the whole image if we can, so look for a preview first.
    parseJPEGMetadata(media.blob, onJPEGParsed);
  }

  function onJPEGParsed(metadata) {
    var blob;

    if (metadata.preview) {
      // If JPEG contains a preview we use it to create the thumbnail
      blob = media.blob.slice(metadata.preview.start, metadata.preview.end,
                              'image/jpeg');
    } else {
      // Otherwise, use the full-size image
      blob = media.blob;
    }

    createThumbnailImage(blob, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT,
                         metadata.rotation, metadata.mirrored, gotThumbnail);
  }

  function gotThumbnail(blob) {
    self.app.emit('newthumbnail', blob);
  }
};

});
