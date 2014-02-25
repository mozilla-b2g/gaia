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
  this.focusRing = app.views.focusRing;
  this.bindEvents();
  this.configure();
  debug('initialized');
}

ViewfinderController.prototype.configure = function() {
  var grid = this.app.settings.grid.selected('key');
  this.viewfinder.set('grid', grid);
};

ViewfinderController.prototype.bindEvents = function() {
  this.app.settings.on('change:grid', this.viewfinder.setter('grid'));
  this.viewfinder.on('click', this.onViewfinderClick);
  this.viewfinder.on('focuspointchange', this.onFocusPointChange);
  this.app.on('camera:configured', this.loadStream);
  this.app.on('camera:configured', this.updatePreview);
  this.app.on('blur', this.onBlur);
};

/**
* capture touch coordinates
* when user clicks view finder
* and call touch focus function.
*
* @param {object} focusPoint
* focusPoint has x and y properties
* which are coordinates of touch
* in Pixels.
*
* focusPoint has boundaries which
* are in camera coordinate system,
* where the top-left of the camera field
* of view is at (-1000, -1000), and
* bottom-right of the field at
* (1000, 1000).
**/
ViewfinderController.prototype.onFocusPointChange = function(focusPoint) {
  var self = this;
  // Set focus and metering areas
  this.camera.setFocusArea(focusPoint);
  this.camera.setMeteringArea(focusPoint);

  // change focus ring positon
  this.focusRing.changePostion(focusPoint);

  // Call auto focus to focus on focus area.
  this.camera.setAutoFocus(focusDone);

  // show focussed ring when focused
  function focusDone() {
    // clear ring UI
    self.camera.clearFocusRing();
  }
};

ViewfinderController.prototype.loadStream = function() {
  this.camera.loadStreamInto(this.viewfinder.els.video);
};

ViewfinderController.prototype.updatePreview = function() {
  var camera = this.app.settings.cameras.selected('key');
  var isFrontCamera = camera === 'front';
  this.viewfinder.updatePreview(this.camera.previewSize(), isFrontCamera);

  // Fade in 100ms later to avoid
  // seeing viewfinder being resized
  setTimeout(this.viewfinder.fadeIn, 100);
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

ViewfinderController.prototype.onBlur = function() {
  this.viewfinder.stopPreview();
  this.viewfinder.setPreviewStream(null);
  this.viewfinder.fadeOut();
};

});
