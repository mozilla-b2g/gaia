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
  this.viewfinder.on('click', this.app.firer('viewfinder:click'));
  this.viewfinder.on('click', this.onViewfinderClick);
  this.app.on('camera:configured', this.loadStream);
  this.app.on('camera:configured', this.updatePreview);
  this.app.on('camera:facefocused', this.focusOnFace);
  this.app.on('camera:facenotdetected', this.focusRing.clearFaceRings);
  this.app.on('blur', this.onBlur);
};

/**
* On detecting Face, Find the max area
* to focus on. Remaining all faces
* will be shown in yellow color.
*
**/
ViewfinderController.prototype.focusOnFace = function(faces) {
  var maxID = -1;
  var maxArea = 0;
  var l = 0;
  var b = 0;
  var a = 0;
  var i = 0;
  var self = this;
  var mainFace = null;
  var face = [];

  // clear any previous focus rings
  this.focusRing.clearFaceRings();

  // Find the max area and save information
  // about all other faces
  // as face boundaries come in camera coordinate
  // system (-1000, -1000) to (1000, 1000), need
  // to scale the coordinated to viewfinder resolution
  for (i=0; i < faces.length; i++) {
    // If any face has less confidence
    // don't consider it
    if (faces[i].score < 20) {
      continue;
    }
    // length
    l = Math.abs(faces[i].rect.right - faces[i].rect.left);
    // breadth
    b = Math.abs(faces[i].rect.bottom - faces[i].rect.top);
    // area
    a = l * b;

    // scaling to match viewfinder resolution
    var px = Math.round((faces[i].rect.left + (l/2)) *
      this.viewfinder.els.frame.clientWidth / 2000);
    var py = Math.round((-1) * (faces[i].rect.top + (b/2)) *
      this.viewfinder.els.frame.clientHeight / 2000);
    var lx = Math.round(b * this.viewfinder.els.frame.clientWidth / 2000);

    face[i] = {
      pointX:px,
      pointY:py,
      length:lx,
      index:i
    };
    // Find maximum area
    if (a > maxArea) {
      maxArea =a;
      maxID = i;
      mainFace = face[i];
    }
  }
  if(maxID > -1) {
    face.splice(maxID, 1);
  }
  // Focus on maximum area ring
  this.focusRing.setMaxID(mainFace);

  // Draw cicles for other faces also
  var k = 0;
  while(face[k]) {
    this.focusRing.tranformRing(face[k].pointX,
      face[k].pointY, face[k].length, face[k].index);
    k++;
  }

  // Find focusing area of biggest face
  var focusPoint = {
    left: faces[maxID].rect.left,
    right: faces[maxID].rect.right,
    top: faces[maxID].rect.top,
    bottom: faces[maxID].rect.bottom
  };

  // Set focus and metering areas
  this.camera.setFocusArea(focusPoint);
  this.camera.setMeteringArea(focusPoint);

  this.viewfinder.focusing = true;
  // Call auto focus to focus on focus area.
  this.camera.setAutoFocus(focusDone);

  // show focussed ring when focused
  function focusDone() {
    // clear ring UI
    self.camera.clearFocusRing();
    self.focusRing.clearFaceRings();
    self.viewfinder.clearFocusingState();
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
  setTimeout(this.viewfinder.fadeIn, 150);
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
