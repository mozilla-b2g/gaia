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
  this.viewfinder.on('scaleChange', this.onScaleChange);
  this.app.on('camera:configured', this.loadStream);
  this.app.on('camera:configured', this.updatePreview);
  this.app.on('blur', this.onBlur);
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

ViewfinderController.prototype.onScaleChange = function(scale) {
  this.camera.mozCamera.zoom = scale;

  var previewSize = this.camera.previewSize();
  var maxPreviewSize = this.camera.mozCamera.capabilities.previewSizes[0];

  var maxHardwareScaleX = maxPreviewSize.width  / previewSize.width;
  var maxHardwareScaleY = maxPreviewSize.height / previewSize.height;
  var maxHardwareScale = Math.max(maxHardwareScaleX, maxHardwareScaleY);
  
  if (scale <= maxHardwareScale) {
    this.viewfinder.setScaleAdjustment(1);
    return;
  }
  
  var virtualPreviewSize = {
    width:  previewSize.width  * maxHardwareScale,
    height: previewSize.height * maxHardwareScale
  };
  var targetPreviewSize = {
    width:  previewSize.width  * scale,
    height: previewSize.height * scale
  };
  var scaleAdjustmentX = targetPreviewSize.width /
                         virtualPreviewSize.width;
  var scaleAdjustmentY = targetPreviewSize.height /
                         virtualPreviewSize.height;
  var scaleAdjustment = Math.max(scaleAdjustmentX,
                                 scaleAdjustmentY);
  
  this.viewfinder.setScaleAdjustment(scaleAdjustment);
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
