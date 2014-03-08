define(function(require, exports, module) {
'use strict';
/**
* Dependencies
*/
var debug = require('debug')('controller:focusring');
var bindAll = require('lib/bind-all');

/**
* Exports
*/
module.exports = function(app) { return new focusmodeController(app); };
module.exports.focusmodeController = focusmodeController;

 /**
 * Initialize a new `focusmodeController`
 *
 * @param {App} app
 */
function focusmodeController(app) {
  //debug('initializing');
  bindAll(this);
  this.app = app;
  this.camera = app.camera;
  this.bindEvents();
}

focusmodeController.prototype.bindEvents = function() {
  this.camera.on('configured', this.setDefaultFocusMode);
};

/**
* Set default focus mode as continuous Auto.
* Later when Face tracking is landed the default
* mode will be changed to Face tracking mode
**/
focusmodeController.prototype.setDefaultFocusMode = function() {
  var cameraID = this.app.settings.cameras.selected('key');
  // Check camera mode
  var isPicture = this.app.settings.mode.is('picture');
  var mode = isPicture?'picture':'video';
  // Set focus mode only to front camera
  if(cameraID != 'front') {
    this.camera.setContinuousAutoFocus();
    this.camera.enableAutoFocusMove();
  }
};

});