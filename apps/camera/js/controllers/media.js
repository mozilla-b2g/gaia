define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('controller:media');
var bindAll = require('lib/bind-all');

/**
 * Exports
 */

module.exports = function(app) { return new MediaController(app); };
module.exports.MediaController = MediaController;

function MediaController(app) {
  bindAll(this);
  this.app = app;
  this.require = app.require;
  this.settings = app.settings;
  this.bindEvents();
  this.configure();
  debug('initialized');
}

MediaController.prototype.bindEvents = function() {
  this.app.on('storage:itemdeleted', this.onItemDeleted);
  this.app.on('previewgallery:deletevideo', this.onItemDeleted);
  this.app.on('previewgallery:deletepicture', this.onItemDeleted);
  this.app.on('storage:changed', this.onStorageChanged);
  this.app.on('newmedia', this.onNewMedia);
  this.app.on('hidden', this.onHidden);
  this.app.on('lazyloaded', this.configured);

  // Preload libraries we may need after capturing to maintain snappiness
  var self = this;
  this.app.once('capture', function() {
    var lib = ['lib/create-thumbnail-image', 'lib/prepare-preview-blob'];
    self.require(lib, function() {});
  });

  debug('events bound');
};

MediaController.prototype.configure = function() {
  this.items = [];            // All the pictures and videos we know about
  this.currentItem = null;

  var dpr = window.devicePixelRatio;
  this.thumbnailSize = {
    width: this.settings.previewGallery.get('thumbnailWidth') * dpr,
    height: this.settings.previewGallery.get('thumbnailHeight') * dpr
  };

  this.configured();
};

MediaController.prototype.configured = function() {
  this.app.emit('media:configured', this.items);
};

MediaController.prototype.onNewMedia = function(item) {
  // If we're handling a pick activity we don't generate thumbnails
  if (this.app.activity.pick) {
    return;
  }

  var self = this;

  if (item.isVideo) {
    // If the new media is video, use it as-is
    addNewMedia(item);
  } else {
    // If it is a photo, find its EXIF preview first
    this.require(['lib/prepare-preview-blob'], function(preparePreview) {
      preparePreview(item.blob, function(metadata) {
        metadata.blob = item.blob;
        metadata.filepath = item.filepath;
        addNewMedia(metadata);
      });
    });
  }

  function addNewMedia(item) {
    self.items.unshift(item);
    self.updateThumbnail();
  }
};

/**
 * Delete all items in the media controller
 * when storage becomes unavailable.
 *
 * @param  {String} status
 */
MediaController.prototype.onStorageChanged = function(status) {
  if (status === 'unavailable') {
    this.configure();
    this.updateThumbnail();
  }
};

/**
 * As a privacy feature, when the camera app is used from the lockscreen
 * and the lockscreen is actually locked with a passcode, we don't want
 * the camera to retain any state from one use to the next. So if the
 * camera is hidden (i.e. if the phone returns to the lockscreen) we
 * forget our state.  In practice, it appears that the system app actually
 * kills the camera when this happens, so this code is redundant.
 */
MediaController.prototype.onHidden = function() {
  if (this.app.inSecureMode) {
    this.configure();          // Forget all stored images
    this.updateThumbnail();    // Get rid of any thumbnail
  }
};

MediaController.prototype.updateThumbnail = function() {
  // This is the media item that we want to create a thumbnail for.
  var media = this.items[0] || null;
  if (media === this.currentItem) {
    return;
  }
  if (media === null) {
    this.app.emit('newthumbnail', null);
    return;
  }

  // To create a thumbanil, we first need to figure out which image
  // blob to use, and what the size and rotation of that image is.
  var blob;                    // The image we'll create the thumbnail from.
  var metadata = {             // The metadata for that image.
    rotation: media.rotation,
    mirrored: media.mirrored
  };

  if (media.isVideo) {
    // If it is a video we can create a thumbnail from the poster image
    blob = media.poster.blob;
    metadata.width = media.poster.width;
    metadata.height = media.poster.height;
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
        metadata.width = media.preview.width;
        metadata.height = media.preview.height;
      }
    }

    // If a thumbnail couldn't be obtained from the EXIF preview,
    // use the full image
    if (!blob) {
      blob = media.blob;
      metadata.width = media.width;
      metadata.height = media.height;
    }
  }

  var self = this;
  this.require(['lib/create-thumbnail-image'], function(createThumbnailImage) {
    createThumbnailImage(blob, metadata, self.thumbnailSize, (thumb) => {
      self.currentItem = media;
      self.app.emit('newthumbnail', thumb);
    });
  });
};

/**
 * Delete and update items in the preview gallery
 * when images/videos are deleted by others
 *
 * @param  {Object} filepath
 */
MediaController.prototype.onItemDeleted = function(data) {
  var deleteIdx = -1;
  var deletedFilepath = typeof(data) === 'object' ? data.path : data;

  // find the item in items
  for (var n = 0; n < this.items.length; n++) {
    if (this.items[n].filepath === deletedFilepath) {
      deleteIdx = n;
      break;
    }
  }

  // Exit when item not found
  if (n === this.items.length) { return; }

  var item = this.items[deleteIdx];

  // Check if this event is being stopped such as in the case
  // of resizing an image for a share activity.
  if (item.resizing) { return; }
  this.items.splice(deleteIdx, 1);
  this.updateThumbnail();
  this.app.emit('media:deleted');
};

});
