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
  var settings = this.app.settings;
  this.viewfinder.on('click', this.onViewfinderClick);
  this.app.on('camera:loaded', this.viewfinder.fadeIn);
  this.app.on('settings:configured', this.onSettingsConfigured);
  settings.on('change:recorderProfiles', this.onRecorderProfilesChange);
  settings.on('change:mode', this.loadStream);
};

ViewfinderController.prototype.onSettingsConfigured = function() {
  this.configurePhoto();
  this.configureVideo();
  this.loadStream();
};

ViewfinderController.prototype.configurePhoto = function() {
  var el = this.app.el;
  var previewSizes = this.app.get('capabilities').previewSizes;
  var viewport = { width: el.clientWidth, height: el.clientHeight };
  var photoPreviewSize = pickPreviewSize(viewport, previewSizes);
  this.streamConfig.photo = photoPreviewSize;
  this.previewSizes.photo = photoPreviewSize;
};

ViewfinderController.prototype.configureVideo = function() {
  var videoSize = this.app.settings.recorderProfiles.value().video;
  var key = this.app.settings.recorderProfiles.selected('key');
  this.streamConfig.video = { profile: key };
  this.previewSizes.video = videoSize;
  debug('configured video key: %s', key);
};

ViewfinderController.prototype.onRecorderProfilesChange = function() {
  var isVideoMode = this.app.settings.value('mode') === 'video';
  this.configureVideo();
  if (isVideoMode) { this.loadStream(); }
};

ViewfinderController.prototype.loadStream = function() {
  var settings = this.app.settings;
  var mode = settings.value('mode');
  var isFrontCamera = settings.cameras.value() === 'front';
  var previewSize = this.previewSizes[mode];
  var options = {
    el: this.viewfinder.el,
    streamConfig: this.streamConfig[mode]
  };

  debug('load stream mode: %s', mode);
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
