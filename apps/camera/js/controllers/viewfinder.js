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

exports = module.exports = function(app) { return new ViewfinderController(app); };
exports.ViewfinderController = ViewfinderController;

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
  this.bindEvents();
  debug('initialized');
}

ViewfinderController.prototype.bindEvents = function() {
  this.viewfinder.on('click', this.onViewfinderClick);
  this.app.on('camera:loaded', this.viewfinder.fadeIn);
  this.app.on('camera:configured', this.loadStream);
  this.app.settings.on('change:mode', this.loadStream);
};

ViewfinderController.prototype.loadStream = function() {
  debug('camera configured');
  var isFrontCamera = this.app.settings.value('cameras') === 'front';
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
  var recording = this.app.get('recording');
  if (recording || this.activity.active) { return; }
  this.filmstrip.toggle();
  debug('click');
};

});
