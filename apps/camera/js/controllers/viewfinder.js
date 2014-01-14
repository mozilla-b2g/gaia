define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var bindAll = require('utils/bindAll');
var debug = require('debug')('controller:viewfinder');

/**
 * Locals
 */

var proto = ViewfinderController.prototype;

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
  bindAll(this);
  this.bindEvents();
  debug('initialized');
}

proto.bindEvents = function() {
  this.camera.on('configured', this.onConfigured);
  this.viewfinder.on('click', this.onViewfinderClick);
};

/**
 * The viewfinder size is updated
 * when the camera is changed.
 *
 * HACK: The viewfinder view has a
 * dependency on the camera.js module
 * due to legacy architecture.
 *
 * @param  {MozCamera} camera
 */
proto.onConfigured = function() {
  debug('camera configured');
  this.viewfinder.setPreviewSize(this.camera.mozCamera, this.camera);
  this.camera.loadStreamInto(this.viewfinder.el, onStreamLoaded);
  function onStreamLoaded(stream) {
    debug('stream loaded %d ms after dom began loading',
      Date.now() - window.performance.timing.domLoading);
  }
};

proto.onViewfinderClick = function() {
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
