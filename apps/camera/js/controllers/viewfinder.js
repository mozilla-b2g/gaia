define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

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
  this.bindEvents();
  debug('initialized');
}

ViewfinderController.prototype.bindEvents = function() {
  this.viewfinder.on('click', this.onViewfinderClick);
  this.app.on('camera:configured', this.loadStream);
  this.app.on('settings:configured', this.configureCamera);
};

ViewfinderController.prototype.configureCamera = function() {
  this.camera.viewportSize = {
    width: this.app.el.clientWidth,
    height: this.app.el.clientHeight
  };
};

ViewfinderController.prototype.loadStream = function() {
  var isFrontCamera = this.app.settings.cameras.value() === 'front';
  debug('load stream mode: %s', this.app.settings.value('mode'));
  this.viewfinder.updatePreview(this.camera.previewSize, isFrontCamera);
  this.camera.loadStreamInto(this.viewfinder.el);
  this.viewfinder.fadeIn();
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
