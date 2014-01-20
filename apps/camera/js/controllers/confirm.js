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

  // Allow these dependencies
  // to be injected if need be.
  this.ConfirmView = app.ConfirmView || ConfirmView;
  this.prepareBlob = app.prepareBlob || prepareBlob;

  bindAll(this);
  this.bindEvents();
  debug('initialized');
}

/**
 * Bind callbacks to required events.
 *
 */
ConfirmController.prototype.bindEvents = function() {
  this.app.on('newimage', this.onNewImage);
  this.app.on('newvideo', this.onNewVideo);
};

/**
 * When inside a 'pick' activity
 * will present the user with a
 * confirm overlay where they can
 * decide to 'select' or 'retake'
 * the photo.
 *
 * @param  {Object} data
 *
 */
ConfirmController.prototype.onNewImage = function(data) {
  if (!this.activity.active) { return; }

  var confirm = new this.ConfirmView();
  var activity = this.activity;
  var camera = this.camera;
  var blob = data.blob;

  confirm
    .render()
    .appendTo(this.container)
    .setupMediaFrame()
    .on('click:select', onSelectClick)
    .on('click:retake', onRetakeClick);

  this.prepareBlob(blob, confirm.showImage);

  function onSelectClick() {
    var width = activity.data.width;
    var height = activity.data.height;
    var needsResizing = width || height;

    if (!needsResizing) {
      post(blob);
      return;
    }

    resizeImage({
      blob: blob,
      width: width,
      height: height
    }, post);
  }

  function onRetakeClick() {
    confirm.destroy();
    camera.resumePreview();
  }

  function post(blob) {
    activity.postResult({
      type: 'image/jpeg',
      blob: blob
    });
  }
};

ConfirmController.prototype.onNewVideo = function(video) {
  if (!this.activity.active) { return; }

  var ConfirmView = this.ConfirmView;
  var confirm = new ConfirmView();
  var activity = this.activity;
  var camera = this.camera;

  confirm
    .render()
    .appendTo(this.container)
    .setupMediaFrame()
    .showVideo(video)
    .on('click:select', onSelectClick)
    .on('click:retake', onRetakeClick);

  function onSelectClick() {
    activity.postResult({
      type: 'video/3gpp',
      blob: video.blob,
      poster: video.poster.blob
    });
  }

  function onRetakeClick() {
    camera.resumePreview();
    confirm.destroy();
  }
};

});
