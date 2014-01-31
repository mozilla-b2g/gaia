define(function(require, exports, module) {
/*jshint laxbreak:true*/

'use strict';

/**
 * Module Dependencies
 */

var prepareBlob = require('utils/prepare-preview-blob');
var debug = require('debug')('controller:confirm');
var resizeImage = require('utils/resizeimage');
var ConfirmView = require('views/confirm');
var bindAll = require('utils/bindAll');

/**
 * Exports
 */

module.exports = function(options) {
  return new ConfirmController(options);
};

/**
 * Initialize a new `ConfirmController`
 *
 * @param {Object} options
 */
function ConfirmController(app) {
  debug('initializing');
  this.activity = app.activity;
  this.container = app.el;
  this.app = app;
  this.camera = app.camera;

  // Allow these dependencies
  // to be injected if need be.
  this.ConfirmView = app.ConfirmView || ConfirmView;
  this.prepareBlob = app.prepareBlob || prepareBlob;

  bindAll(this);
  this.bindEvents();

  debug('initialized');
}

ConfirmController.prototype.renderView = function() {
  if (this.confirmView) {
    this.confirmView.show();
    return;
  }
  this.confirmView = new this.ConfirmView();
  this.confirmView.hide();
  this.confirmView.render().appendTo(this.container);
  this.confirmView.on('click:select', this.onSelectMedia);
  this.confirmView.on('click:retake', this.confirmView.hide);
  this.camera.resumePreview();
};

/**
 * Bind callbacks to required events.
 *
 */
ConfirmController.prototype.bindEvents = function() {
  this.app.on('newimage', this.onNewMedia);
  this.app.on('newvideo', this.onNewMedia);
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
  if (!this.activity.active) { return; }

  this.newMedia = newMedia;
  this.renderView();
  if (newMedia.isVideo) { // Is video
    this.confirmView.showVideo(newMedia);
  } else { // Is Image
    this.prepareBlob(this.newMedia.blob, this.confirmView.showImage);
  }
};

ConfirmController.prototype.onSelectMedia = function() {
  var needsResizing;
  var activity = this.activity;
  var media = {
    blob: this.newMedia.blob
  };

  if (this.newMedia.isVideo) { // Is Video
    media.type = 'video/3gpp';
    media.poster = this.newMedia.poster.blob;
  } else { // Is Image
    media.type = 'image/jpeg';
    needsResizing = this.newMedia.width || this.newMedia.height;
    if (needsResizing) {
      resizeImage({
        blob: this.newMedia.blob,
        width: this.newMedia.width,
        height: this.newMedia.height
      }, function(newBlob) {
        media.blob = newBlob;
        activity.postResult(media);
      });
      return;
    }
  }
  activity.postResult(media);

};

});
