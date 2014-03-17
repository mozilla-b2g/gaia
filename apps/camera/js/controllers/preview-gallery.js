define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('controller:preview-gallery');
var bindAll = require('lib/bind-all');

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
  this.viewfinder = app.views.viewfinder;
  this.previewGallery = app.views.previewGallery;
  this.controls = app.views.controls;
  this.bindEvents();
  this.configure();
  debug('initialized');
}

PreviewGalleryController.prototype.bindEvents = function() {
  this.previewGallery.on('click:gallery', this.onGalleryButtonClick);
  this.previewGallery.on('click:share', this.shareCurrentItem);
  this.previewGallery.on('click:delete', this.deleteCurrentItem);
  this.previewGallery.on('click:back', this.closePreview);
  this.previewGallery.on('itemChange', this.handleItemChange);

  this.app.on('preview', this.previewItem);
  this.app.on('newmedia', this.onNewMedia);
  this.app.on('blur', this.onBlur);

  this.storage.on('itemdeleted', this.onItemDeleted);

  debug('events bound');
};

PreviewGalleryController.prototype.configure = function() {
  this.currentItemIndex = 0;
  this.items = [];
};

/**
 * Open the gallery app when the
 * gallery button is pressed.
 *
 * @private
 */
PreviewGalleryController.prototype.onGalleryButtonClick = function(event) {
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
  var msg, storage, filepath;

  if (item.isVideo) {
    msg = navigator.mozL10n.get('delete-video?');
    storage = this.storage.video;
    filepath = item.filepath;
  }
  else {
    msg = navigator.mozL10n.get('delete-photo?');
    storage = this.storage.image;
    filepath = item.filepath;
  }

  if (confirm(msg)) {
    this.deleteItem(filepath);
    // Actually delete the file
    storage.delete(filepath).onerror = function(e) {
      console.warn('Failed to delete', filepath,
                   'from DeviceStorage:', e.target.error);
    };

    // If this is a video file, delete its poster image as well
    if (item.isVideo) {
      var poster = filepath.replace('.3gp', '.jpg');
      var pictureStorage = this.storage.image;

      pictureStorage.delete(poster).onerror = function(e) {
        console.warn('Failed to delete poster image', poster,
                     'for video', filepath, 'from DeviceStorage:',
                     e.target.error);
      };
    }
  }
};

/**
 * Delete the item with corresponding filepath
 * and update the thumbnail icon 
 * on the viewfinder if needed.
 *
 * @param  {String} filepath
 */
PreviewGalleryController.prototype.deleteItem = function(filepath) {
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
  for (var n = 0; n < this.items.length; n++) {
    if (this.items[n].filepath === deletedFileName) {
      deletedItem = this.items[n];
      deleteIdx = n;
      break;
    }
  }

  // Exit when item not found
  if (n === this.items.length) { return; }

  // Remove the item from the array of items
  this.items.splice(deleteIdx, 1);

  // If there are no more items, go back to the camera
  if (this.items.length === 0) {
    this.controls.removeThumbnail();
    this.closePreview();
  }
  else {
    if (deleteIdx == this.items.length) {
      this.currentItemIndex = this.items.length - 1;
    }
    else if (deleteIdx === 0) {
      // Update thumbnail icon to the previous image 
      // when delete the latest image
      var newItem = this.items[this.currentItemIndex];
      this.controls.setThumbnail(newItem.thumbnail);
    }

    var isPreviewOpened = this.previewGallery.isPreviewOpened();
    if (isPreviewOpened) {
      this.previewItem();
    }
  }
};

PreviewGalleryController.prototype.closePreview = function() {
  var camera = this.app.camera;
  if(camera.mozCamera) {
    camera.resumePreview();
  }

  this.currentItemIndex = 0;
  this.previewGallery.close();
  this.app.emit('previewgallery:closed');
};

/**
 * To Do: Image Swipe Transition
 */
PreviewGalleryController.prototype.handleItemChange = function(e) {
  var direction = e.detail.direction;
  switch (direction) {
  case 'left': // go to next image
    if (this.currentItemIndex < this.items.length - 1) {
      this.currentItemIndex += 1;
      this.previewItem();
    }
    break;
  case 'right': // go to previous
    if (this.currentItemIndex > 0) {
      this.currentItemIndex -= 1;
      this.previewItem();
    }
    break;
  }
};

PreviewGalleryController.prototype.onNewMedia = function(item) {
  this.items.unshift(item);
};

PreviewGalleryController.prototype.previewItem = function() {
  var index = this.currentItemIndex;
  var item = this.items[index];
  var isPreviewOpened = this.previewGallery.isPreviewOpened();

  if(!isPreviewOpened) {
    var secureMode = this.app.inSecureMode;
    this.previewGallery.set('secure', secureMode);
    this.previewGallery.open();
  }
  this.previewGallery.updateCountText(index + 1, this.items.length);

  if (item.isVideo) {
    this.previewGallery.showVideo(item);
  } else {
    this.previewGallery.showImage(item);
  }

  this.app.emit('previewgallery:opened');
};

/**
 * Delete items in Gallery app
 * when the preview gallery is opened.
 *
 * Delete items in the preview gallery also. 
 *
 * @param  {Object} data
 */
PreviewGalleryController.prototype.onItemDeleted = function(data) {
  var startString = data.path.indexOf('DCIM/');
  var filepath = data;

  if (startString < -1) { return; }
  else if (startString > 0) {
    filepath = data.path.substr(startString);
  }

  this.deleteItem(filepath);
};

PreviewGalleryController.prototype.onBlur = function() {
  if (this.app.inSecureMode) {
    this.closePreview();
    this.configure();
  }

};

});
