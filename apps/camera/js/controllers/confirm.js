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
  if (!this.activity.pick) { return; }

  if (!this.view) {
    this.view = new this.ConfirmView();
    this.view.maxPreviewSize = window.CONFIG_MAX_IMAGE_PIXEL_SIZE;
    this.view.render().appendTo(this.container);

    // We want to listen to select events exactly once
    // The media is selected, the confirm view dismissed
    // and the activity returns
    this.view.once('click:select', this.onSelectMedia);
    this.view.on('click:retake', this.onRetakeMedia);
    this.view.on('loadingvideo', this.app.firer('busy'));
    this.view.on('playingvideo', this.app.firer('ready'));
  }

  this.view.show();
  this.app.set('confirmViewVisible', true);
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
  this.camera.on('change:recording', this.onRecordingChange);

  // Update the MediaFrame contents with the image/video upon
  // receiving the `newmedia` event. This event is slightly delayed
  // since it waits for the storage callback to complete.
  this.app.on('newmedia', this.onNewMedia);
};

ConfirmController.prototype.onRecordingChange = function(recording) {
  if (!this.activity.pick) { return; }

  if (recording === 'starting') {
    this.recorded = true;
  } else if (recording === 'error') {
    this.recorded = false;
  } else if (recording === 'stopped' && this.recorded) {
    this.renderView();
  }
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
    this.view.showVideo(newMedia);
  } else { // Is Image
    this.prepareBlob(this.newMedia.blob, this.view.showImage);
  }
};

ConfirmController.prototype.onSelectMedia = function() {
  this.app.emit('confirm:selected', this.newMedia);
};

ConfirmController.prototype.onRetakeMedia = function() {
  this.view.hide();
  this.view.clearMediaFrame();
  this.app.set('confirmViewVisible', false);
};

});
