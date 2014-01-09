define(function(require, exports, module) {
/*jshint laxbreak:true*/

'use strict';

/**
 * Module Dependencies
 */

var prepareBlob = require('utils/prepare-preview-blob');
var ConfirmView = require('views/confirm');
var debug = require('debug')('controller:confirm');
var bindAll = require('utils/bindAll');

/**
 * Locals
 */

var proto = ConfirmController.prototype;

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
function ConfirmController(options) {
  debug('initializing');
  this.activity = options.activity;
  this.camera = options.camera;
  this.container = options.el;

  // Allow these dependencies
  // to be injected if need be.
  this.ConfirmView = options.ConfirmView || ConfirmView;
  this.prepareBlob = options.prepareBlob || prepareBlob;

  bindAll(this);
  this.bindEvents();
  debug('initialized');
}

/**
 * Bind callbacks to required events.
 *
 */
proto.bindEvents = function() {
  this.camera.on('newimage', this.onNewImage);
  this.camera.on('newvideo', this.onNewVideo);
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
proto.onNewImage = function(data) {
  if (!this.activity.active) { return; }

  var activity = this.activity;
  var confirm = new this.ConfirmView();
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
    camera._resizeBlobIfNeeded(blob, function(resized) {
      activity.postResult({
        type: 'image/jpeg',
        blob: resized
      });
    });
  }

  function onRetakeClick() {
    confirm.destroy();
    camera.resumePreview();
  }
};

proto.onNewVideo = function(data) {
  if (!this.activity.active) { return; }

  var ConfirmView = this.ConfirmView;
  var confirm = new ConfirmView();
  var activity = this.activity;
  var camera = this.camera;

  confirm
    .render()
    .appendTo(this.container)
    .setupMediaFrame()
    .showVideo(data)
    .on('click:select', onSelectClick)
    .on('click:retake', onRetakeClick);

  function onSelectClick() {
    activity.postResult({
      type: 'video/3gpp',
      blob: data.blob,
      poster: data.poster.blob
    });
  }

  function onRetakeClick() {
    camera.resumePreview();
    confirm.destroy();
  }
};

});
