define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var bindAll = require('utils/bindAll');
var debug = require('debug')('controller:viewfinder');

/**
 * Exports
 */

module.exports = function(app) {
  return new ViewfinderController(app);
};

/**
 * Initialize a new `ViewfinderController`
 *
 * @param {App} app
 */
function ViewfinderController(app) {
  debug('initializing');
  this.viewfinder = app.views.viewfinder;
  this.filmstrip = app.filmstrip;
  this.activity = app.activity;
  this.camera = app.camera;
  this.app = app;
  bindAll(this);
  this.bindEvents();
  debug('initialized');
}

ViewfinderController.prototype.bindEvents = function() {
  this.app.on('camera:configured', this.onConfigured);
  this.camera.on('change:mode', this.onConfigured);
  this.viewfinder.on('click', this.onViewfinderClick);
  this.app.on('camera:loaded', this.viewfinder.fadeIn);
};

ViewfinderController.prototype.onConfigured = function() {
  debug('camera configured');
  var isFrontCamera = this.app.get('selectedCamera') === 1;
  this.viewfinder.updatePreview(this.camera.previewSize, isFrontCamera);
  this.camera.loadStreamInto(this.viewfinder.el, onStreamLoaded);
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
  var recording = this.camera.get('recording');
  if (recording || this.activity.active) { return; }
  this.filmstrip.toggle();
  debug('click');
};

});
