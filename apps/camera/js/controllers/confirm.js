define(function(require, exports, module) {
/*jshint laxbreak:true*/

'use strict';

/**
 * Module Dependencies
 */

var prepareBlob = require('lib/prepare-preview-blob');
var debug = require('debug')('controller:confirm');
var ConfirmView = require('views/confirm');
var bindAll = require('lib/bind-all');

/**
 * Exports
 */

module.exports = function(options) { return new ConfirmController(options); };
module.exports.ConfirmController = ConfirmController;

/**
 * Initialize a new `ConfirmController`
 *
 * @param {Object} options
 */
function ConfirmController(app) {
  this.app = app;
  this.settings = app.settings;
  this.activity = app.activity;
  this.camera = app.camera;
  this.container = app.el;

  // Allow these dependencies
  // to be injected if need be.
  this.ConfirmView = app.ConfirmView || ConfirmView;
  this.prepareBlob = app.prepareBlob || prepareBlob;

  bindAll(this);
  this.bindEvents();
  debug('initialized');
}

ConfirmController.prototype.renderView = function() {
  if (!this.activity.pick) {
    return;
  }

  if (this.confirmView) {
    this.confirmView.show();
    return;
  }

  this.confirmView = new this.ConfirmView();
  this.confirmView.maxPreviewSize = window.CONFIG_MAX_IMAGE_PIXEL_SIZE;
  this.confirmView.render().appendTo(this.container);

  this.confirmView.on('click:select', this.onSelectMedia);
  this.confirmView.on('click:retake', this.onRetakeMedia);
};

/**
 * Bind callbacks to required events.
 *
 */
ConfirmController.prototype.bindEvents = function() {

  // Render/Show the view on the `newimage` and `newvideo` events
  // since they are fired immediately when tapping 'Capture'/'Stop'.
  // This prevents the 'Capture'/'Stop' button from being able to be
  // triggered multiple times before the confirm view appears.
  this.camera.on('newimage', this.renderView);
  this.camera.on('newvideo', this.renderView);

  // Update the MediaFrame contents with the image/video upon
  // receiving the `newmedia` event. This event is slightly delayed
  // since it waits for the storage callback to complete.
  this.app.on('newmedia', this.onNewMedia);
};

/**
 * When inside a 'pick' activity
 * will present the user with a
 * confirm overlay where they can
 * decide to 'select' or 'retake'
 * the photo or video
 *
 * @param  {Object} data
 *
 */
ConfirmController.prototype.onNewMedia = function(newMedia) {
  if (!this.activity.pick) { return; }

  this.newMedia = newMedia;
  if (newMedia.isVideo) { // Is video
    this.confirmView.showVideo(newMedia);
  } else { // Is Image
    this.prepareBlob(this.newMedia.blob, this.confirmView.showImage);
  }
};

ConfirmController.prototype.onSelectMedia = function() {
  this.app.emit('confirm:selected', this.newMedia);
};

ConfirmController.prototype.onRetakeMedia = function() {
  this.confirmView.hide();
  this.confirmView.clearMediaFrame();
};

});
