define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('controller:preview-gallery');
var bindAll = require('lib/bind-all');
var PreviewGalleryView = require('views/preview-gallery');

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
  this.controls = app.views.controls;
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
  this.items = [];
};

PreviewGalleryController.prototype.openPreview = function() {
  if (this.view) { return; }
  this.view = new PreviewGalleryView()
    .render()
    .appendTo(this.app.el);

  this.view.on('click:gallery', this.onGalleryButtonClick);
  this.view.on('click:share', this.shareCurrentItem);
  this.view.on('click:delete', this.deleteCurrentItem);
  this.view.on('click:back', this.closePreview);
  this.view.on('itemChange', this.handleItemChange);

  this.previewItem();
};

PreviewGalleryController.prototype.closePreview = function() {
  if (this.view) {
    this.currentItemIndex = 0;
    this.view.close();
    this.view.destroy();
    this.view = null;
    this.app.emit('previewgallery:closed');
  }
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

  if (confirm(msg)) {
    this.updatePreviewGallery(index);

    // Actually delete the file
    if (item.isVideo) { this.storage.deleteVideo(filepath); }
    else { this.storage.deleteImage(filepath); }
  }
};

/**
 * Update the preview with the latest recent item
 * after deleting images/videos.
 * If needed, update thumbnail also.
 *
 * @param  {String} index
 */
PreviewGalleryController.prototype.updatePreviewGallery = function(index) {
  // Remove the item from the array of items
  this.items.splice(index, 1);

    // If there are no more items, go back to the camera
  if (this.items.length === 0) {
    this.app.emit('removeThumbnail');
    this.closePreview();
  }
  else {
    if (index == this.items.length) {
      this.currentItemIndex = this.items.length - 1;
    }
    else if (index === 0) {
      // Update thumbnail icon when delete the latest image
      var newItem = this.items[this.currentItemIndex];
      this.app.emit('changeThumbnail', newItem);
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
  this.items.unshift(item);
};

PreviewGalleryController.prototype.previewItem = function() {
  var index = this.currentItemIndex;
  var item = this.items[index];
  var isPreviewOpened = this.view.isPreviewOpened();

  if(!isPreviewOpened) {
    // If lockscreen is locked, hide all control buttons
    var secureMode = this.app.inSecureMode;
    this.view.set('secure-mode', secureMode);
    this.view.open();
  }
  this.view.updateCountText(index + 1, this.items.length);

  if (item.isVideo) { this.view.showVideo(item); }
  else { this.view.showImage(item); }

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
 * If the lockscreen is locked then
 * close the preview and forget everything taken images/videos
 * when lost focus on the preview gallery
 */
PreviewGalleryController.prototype.onBlur = function() {
  if (this.app.inSecureMode) {
    this.closePreview();
    this.configure();
  }
};

});
