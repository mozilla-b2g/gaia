define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('controller:storage');
var bindAll = require('lib/bind-all');
var Storage = require('lib/storage');

/**
 * Exports
 */

module.exports = function(app) { return new StorageController(app); };
module.exports.StorageController = StorageController;

/**
 * Initialize a new `StorageController`
 *
 * @param {App} app
 */
function StorageController(app) {
  bindAll(this);
  this.app = app;
  this.camera = app.camera;
  this.settings = app.settings;
  this.storage = app.storage || new Storage();
  this.bindEvents();
  this.configure();
  debug('initialized');
}

/**
 * Initial configuration.
 *
 * Give the camera a way to create video filepaths.
 * This is so that the camera can record videos
 * directly to the final location without us
 * having to move the video file from temporary,
 * to final location at recording end.
 *
 * @private
 */
StorageController.prototype.configure = function() {
  this.storage.configure();
  this.camera.createVideoFilepath = this.storage.createVideoFilepath;
  this.updateMaxFileSize();
};

/**
 * Bind to relevant events.
 *
 * @private
 */
StorageController.prototype.bindEvents = function() {
  debug('bind events');

  // App
  this.settings.pictureSizes.on('change:selected', this.updateMaxFileSize);
  this.app.on('previewgallery:deletepicture', this.storage.deletePicture);
  this.app.on('previewgallery:deletevideo', this.storage.deleteVideo);
  this.app.on('settings:configured', this.updateMaxFileSize);
  this.app.on('camera:newimage', this.storePicture);
  this.app.on('camera:newvideo', this.storeVideo);
  this.app.on('visible', this.storage.check);

  // Storage
  this.storage.on('volumechanged', this.app.firer('storage:volumechanged'));
  this.storage.on('itemdeleted', this.app.firer('storage:itemdeleted'));
  this.storage.on('changed', this.onChanged);
  this.storage.on('checked', this.onChecked);
  debug('events bound');
};

/**
 * Relay storage state change events.
 *
 * @param  {String} state
 * @private
 */
StorageController.prototype.onChanged = function(state) {
  debug('changed: %s', state);
  this.app.emit('storage:changed', state);
};

/**
 * Emit the outcome of a storage check
 * so that other parts of the app
 * can respond.
 *
 * @param  {String} value
 * @private
 */
StorageController.prototype.onChecked = function(value) {
  debug('checked: %s', value);
  this.app.emit('storage:checked', value);
  this.app.emit('storage:checked:' + value);
};

/**
 * Store a picture.
 *
 * In either case, save the memory-backed
 * photo blob to device storage, retrieve
 * the resulting File (blob) and pass that
 * around instead of the original memory blob.
 *
 * This is critical for "pick" activity consumers
 * where the memory-backed Blob is either highly
 * inefficent or will almost-immediately become
 * inaccesible, depending on the state of the
 * platform. https://bugzil.la/982779
 *
 * @param  {Object} picture
 * @private
 */
StorageController.prototype.storePicture = function(picture) {
  var memoryBlob = picture.blob;
  var self = this;

  this.storage.addPicture(
    memoryBlob,
    function(error, filepath, abspath, fileBlob) {
      picture.blob = fileBlob;
      picture.filepath = filepath;
      debug('stored picture', picture);
      self.app.emit('newmedia', picture);
  });
};

/**
 * Store a video.
 *
 * Store the poster image,
 * then emit the app 'newvideo'
 * event. This signifies the video
 * fully ready.
 *
 * We don't store the video blob like
 * we do for images, as it is recorded
 * directly to the final location.
 * This is for memory reason.
 *
 * @param  {Object} video
 */
StorageController.prototype.storeVideo = function(video) {
  debug('new video', video);
  var poster = video.poster;
  var self = this;

  // Add the poster image to the image storage
  poster.filepath = video.filepath.replace('.3gp', '.jpg');
  video.isVideo = true;

  this.storage.addPicture(
    poster.blob,
    { filepath: poster.filepath },
    function(error, path, absolutePath, fileBlob) {
      // Replace the memory-backed Blob with the DeviceStorage file-backed File.
      // Note that "video" references "poster", so video previews will use this
      // File.
      poster.blob = fileBlob;
      debug('new video', video);
      self.app.emit('newmedia', video);
  });
};

/**
 * Calculate and set a `maxFileSize`
 * value on the storage instance.
 *
 * This is so that it can alert us when there
 * isn't enough space left in storage
 * to accomodate a new picture.
 *
 * 1. It is possible for the selected camera
 *    to be changed before the storage controller
 *    has been 'lazy-loaded'. This condition
 *    guards against the case when the camera
 *    hasn't finished loading and pictureSize
 *    data is unavailable.
 *
 * 2. It is very unlikely that a JPEG file will have a file size that is
 *    more than half a byte per pixel. There is some fixed EXIF overhead
 *    that is the same for small and large pictures, however, so we add
 *    an additional 25,000 bytes of padding.
 *
 * @private
 */
StorageController.prototype.updateMaxFileSize = function() {
  var pictureSize = this.settings.pictureSizes.selected('data');
  if (!pictureSize) { return; } // 1.
  var bytes = (pictureSize.width * pictureSize.height / 2) + 25000; // 2.
  this.storage.setMaxFileSize(bytes);
  debug('maxFileSize updated %s', bytes);
};

});