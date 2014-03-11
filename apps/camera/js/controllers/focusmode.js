define(function(require, exports, module) {
'use strict';
/**
* Dependencies
*/
var debug = require('debug')('controller:focusmode');
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
  bindAll(this);
  this.app = app;
  this.camera = app.camera;
  this.viewfinder = app.views.viewfinder;
  this.focusRing = app.views.focusRing;
  this.bindEvents();
}

focusmodeController.prototype.bindEvents = function() {
  // Select default Focus Mode
  this.camera.on('configured', this.setDefaultFocusMode);
  // Listen for touch events
  this.viewfinder.on('focuspointchange', this.onFocusPointChange);
};

/**
* Set default focus mode as continuous Auto.
* Later when Face tracking is landed the default
* mode will be changed to Face tracking mode on availability.
**/
focusmodeController.prototype.setDefaultFocusMode = function() {
  var self = this;
  var cameraID = this.app.settings.cameras.selected('key');

  // Set focus mode only to front camera
  if(cameraID !== 'front') {
    this.camera.checkContinuousFocusSupport(onAvailable);
  }
  function onAvailable (err) {
    if (err) {
      self.camera.noFocusMode();
      return;
    }
    // Start continuous Auto Focus mode
    self.camera.setContinuousAutoFocus();
    // Enable Gecko callbacks of success
    self.camera.enableAutoFocusMove();
  }

};

/**
* Once user touches on viewfinder 
* capture touch coordinates
*
* @param {object} focusPoint
* focusPoint has x and y properties
* which are coordinates of touch
* in Pixels.
*
* @param {object} rect
* This rectangle has boundaries which
* are in camera coordinate system,
* where the top-left of the camera field
* of view is at (-1000, -1000), and
* bottom-right of the field at
* (1000, 1000).
**/
focusmodeController.prototype.onFocusPointChange = function(focusPoint, rect) {
  var self = this;
  this.camera.set('focus-mode', 'touch-focus');
  this.camera.disableAutoFocusMove();

  // Set focus and metering areas
  this.camera.setFocusArea(rect);
  this.camera.setMeteringArea(rect);

  // change focus ring positon with pixel values
  this.focusRing.changePosition(focusPoint.x, focusPoint.y);

  // Call auto focus to focus on focus area.
  this.camera.focus(focusDone);

  // show focussed ring when focused
  function focusDone(err) {
    // Need to clear ring UI when focused.
    // Timeout is needed to show the focused ring.
      // Set focus-mode to touch-focus
    setTimeout(function() {
      self.focusRing.setState('none');
      self.resetFocusRingPosition();
      self.camera.setContinuousAutoFocus();
      self.camera.enableAutoFocusMove();
    }, 1000);
  }
};

/**
* Reset focus ring position to center
* on completing touch focus.
**/
focusmodeController.prototype.resetFocusRingPosition = function() {
  var x = this.viewfinder.el.clientWidth / 2;
  var y = this.viewfinder.el.clientHeight / 2;
  // change focus ring positon
  this.focusRing.changePosition(x, y);
};

});