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
  this.viewfinder.on('focusPointChange', this.onFocusPointChange);
  this.app.on('camera:configured', this.loadStream);
  this.app.on('camera:configured', this.updatePreview);
};

/**
 * capture touch coordinates
 * when user clicks view finder
 * and call touch focus function.
 *
 */
ViewfinderController.prototype.onFocusPointChange = function(focusPoint) {
  var self = this;
  var focusArea = this.viewfinder.findFocusArea(focusPoint);

  // Set focus and metering areas
  this.camera.setFocusArea(focusArea);
  this.camera.setMeteringArea(focusArea);

  // set focus ring positon
  this.app.views.focusRing.el.style.left = focusPoint.x + 'px';
  this.app.views.focusRing.el.style.top = focusPoint.y + 'px';

  // Call auto focus to focus on focus area.
  this.camera.setAutoFocus(focusDone);

  function focusDone() {
    // clear ring UI
    self.camera.clearFocusRing();
    // update focus flag when touch is available
    self.viewfinder.setTouchFocusDone();
  }
};

ViewfinderController.prototype.loadStream = function() {
  this.camera.loadStreamInto(this.viewfinder.els.video);
  this.viewfinder.fadeIn();
};

ViewfinderController.prototype.updatePreview = function() {
  var camera = this.app.settings.cameras.selected('key');
  var isFrontCamera = camera === 'front';
  this.viewfinder.updatePreview(this.camera.previewSize(), isFrontCamera);
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
