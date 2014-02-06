define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var pickPreviewSize = require('lib/camera-utils').selectOptimalPreviewSize;
var debug = require('debug')('controller:viewfinder');
var bindAll = require('lib/bind-all');

/**
 * Exports
 */

module.exports = function(app) { return new ViewfinderController(app); };
module.exports.ViewfinderController = ViewfinderController;

/**
 * Initialize a new `ViewfinderController`
 *
 * @param {App} app
 */
function ViewfinderController(app) {
  debug('initializing');
  bindAll(this);
  this.app = app;
  this.camera = app.camera;
  this.activity = app.activity;
  this.filmstrip = app.filmstrip;
  this.viewfinder = app.views.viewfinder;
  this.previewSizes = {};
  this.streamConfig = {};
  this.bindEvents();
  debug('initialized');
}

ViewfinderController.prototype.bindEvents = function() {
  this.viewfinder.on('click', this.onViewfinderClick);
  this.app.on('camera:loaded', this.viewfinder.fadeIn);
  this.app.on('settings:configured', this.onSettingsConfigured);
  this.app.settings.on('change:mode', this.loadStream);
};

ViewfinderController.prototype.onSettingsConfigured = function() {
  var el = this.app.el;
  var settings = this.app.settings;
  var photoPreviewSizes = this.app.get('capabilities').previewSizes;
  var videoProfile = settings.videoSizes.selected('key');
  var viewport = { width: el.clientWidth, height: el.clientHeight };
  var photoPreviewSize = pickPreviewSize(viewport, photoPreviewSizes);
  var mode = settings.value('mode');

  // Store chosen preview sizes
  this.streamConfig.photo = photoPreviewSize;
  this.streamConfig.video = { profile: videoProfile };
  this.previewSizes.photo = photoPreviewSize;
  this.previewSizes.video = settings.videoSizes.value();

  this.loadStream(mode);
};

ViewfinderController.prototype.loadStream = function(mode) {
  debug('load stream mode: %s', mode);

  var settings = this.app.settings;
  var isFrontCamera = settings.cameras.value() === 'front';
  var previewSize = this.previewSizes[mode];
  var options = {
    el: this.viewfinder.el,
    streamConfig: this.streamConfig[mode]
  };

  this.viewfinder.updatePreview(previewSize, isFrontCamera);
  this.camera.loadStreamInto(options, onStreamLoaded);

  function onStreamLoaded(stream) {
    debug('stream loaded %d ms after dom began loading',
    Date.now() - window.performance.timing.domLoading);
  }
};

/**
 * Toggles the filmstrip, but not
 * whilst recording or within an
 * activity session.
 *
 * @private
 */
ViewfinderController.prototype.onViewfinderClick = function() {
  var recording = this.app.get('recording');
  if (recording || this.activity.active) { return; }
  this.filmstrip.toggle();
  debug('click');
};

});
