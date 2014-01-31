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

module.exports = ViewfinderController;

/**
 * Initialize a new `ViewfinderController`
 *
 * @param {App} app
 */
function ViewfinderController(app) {
  if (!(this instanceof ViewfinderController)) {
    return new ViewfinderController(app);
  }

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
  this.camera.on('configured', this.onConfigured);
  this.camera.on('change:mode', this.onConfigured);
  this.camera.on('streamloaded', this.onStreamLoaded);
  this.viewfinder.on('click', this.onViewfinderClick);
  this.app.on('cameraToggled', this.onCameraToggled);
};

ViewfinderController.prototype.onStreamLoaded = function() {
  this.viewfinder.fadeIn();
};

ViewfinderController.prototype.onCameraToggled = function() {
  var self = this;
  this.viewfinder.fadeOut(
    function(){
      self.camera.toggleMode();
  });
};

ViewfinderController.prototype.onConfigured = function() {
  this.camera.loadStreamInto(this.viewfinder.el);
  this.viewfinder.updatePreview(this.camera.previewSize,
                                this.camera.get('selectedCamera') === 'front');
};

ViewfinderController.prototype.onViewfinderClick = function() {
  var recording = this.camera.get('recording');

  // The filmstrip shouldn't be
  // shown while camera is recording.
  if (recording || this.activity.active) {
    return;
  }

  this.filmstrip.toggle();
  debug('click');
};

});
