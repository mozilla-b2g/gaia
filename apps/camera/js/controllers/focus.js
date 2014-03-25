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
exports = module.exports  = function(app) {
  return new focusmodeController(app); };
exports.focusmodeController = focusmodeController;

 /**
 * Initialize a new `focusmodeController`
 *
 * @param {App} app
 */
function focusmodeController(app) {
  /*jshint validthis:true */
  debug('initializing');
  bindAll(this);
  this.app = app;
  this.camera = app.camera;
  this.viewfinder = app.views.viewfinder;
  this.focusRing = app.views.focusRing;
  this.focus = app.settings.focus;
  this.defaultMode = this.focus.get('defaultMode');
  this.selectedModes = {};
  this.lastEventTime = 0;
  this.minFaceScore = 20;
  this.focusTimeOut = null;
  this.faceDisable = false;
  this.bindEvents();
}

focusmodeController.prototype.bindEvents = function() {
  // Select default Focus Mode
  //this.camera.on('configured', this.configureFocusModes);
  //this.camera.on('configured', this.setDefaultFocusMode);
  
  // When device is not capable of face focus
  // switch to Continuous autofocus or no focus mode
  /*this.camera.on('facenotdetected', );*/
  this.camera.on('camera:loaded', this.configureFocusModes);
  // When visibility of camera app is hidden
  this.app.on('blur', this.resetFocusModes);
  
  // use disable Focus Callbacks for all focus modes.
  // when camera app is reopened enable highest priority focus mode.

};

/**
* This functions checks the capability of all
* focus modes and enables Focus with default mode.
*
**/
focusmodeController.prototype.configureFocusModes = function() {
  var selectedCamera = this.camera.get('selectedCamera');
  var cameraMode = this.app.settings.mode.selected('key');
  this.focusModes = this.focus.get(selectedCamera);
  for (var mode in this.focusModes) {
    var focusMode = this.focusModes[mode];
    if (focusMode.supported && focusMode[cameraMode]) {
      focusMode = this.checkFocusCapability(focusMode);
      if (focusMode.capability) {
        this.selectedModes[focusMode.key] = focusMode;
      }
    }
  }
  this.setDefaultFocusmode();
};

focusmodeController.prototype.checkFocusCapability =
 function(focusMode) {
  switch (focusMode.key) {
    case 'continuousFocus': {
      focusMode.capability = this.camera.continuousFocusModeCheck();
      if (focusMode.capability) {
        focusMode.enable = this.setContinuousFocusMode;
        focusMode.disable = this.disableContinuousFocus;
      }
      break;
    }
    case 'faceTracking': {
      focusMode.capability = this.camera.faceTrackingModeCheck();
      if (focusMode.capability) {
        focusMode.enable = this.setFaceFocusMode;
        focusMode.disable = this.disableFaceTracking;
        this.camera.on('facedetected', this.onFacedetected);
        this.camera.on('nofacedetected', this.setDefaultFocusmode);
      }
      break;
    }
    case 'touchFocus': {
      focusMode.capability = this.camera.touchFocusModeCheck();
      if (focusMode.capability) {
        // Listen for touch events
        this.viewfinder.on('focuspointchange', this.onFocusPointChange);
      }
      break;
    }
    case 'autoFocus': {
      focusMode.capability = this.camera.autoFocusModeCheck();
      if (focusMode.capability) {
        focusMode.enable = this.setAutoFocusMode;
        focusMode.disable = this.disableAutoFocus;
      }
      break;
    }
    case 'fixedFocus': {
       focusMode.capability = true;
       if (focusMode.capability) {
        focusMode.enable = function() {
          //TODO implement enable function
        };
        focusMode.disable = function() {
         //TODO implement disable function
        };
      }
      break;
    }
  }
  return focusMode;
};

focusmodeController.prototype.resetFocusModes = function() {
  this.camera.clearFocusRing();
  for (var modes in this.selectedModes) {
    if (this.selectedModes[modes].disable) {
      this.selectedModes[modes].disable();
      if (modes === 'faceTracking') {
        this.camera.off('facedetected', this.onFacedetected);
        this.camera.off('nofacedetected', this.setDefaultFocusmode);
      } else if (modes === 'touchFocus') {
        this.viewfinder.off('focuspointchange', this.onFocusPointChange);

      }
    }
  }
  this.setCurrentFocusMode(null);
};

focusmodeController.prototype.setDefaultFocusmode = function() {
  this.checkfaceTrackingState();
  if(this.defaultMode === this.getCurrentFocusMode()) { return; }
  if (this.selectedModes[this.defaultMode] ) {
    this.selectedModes[this.defaultMode].enable();
    this.setCurrentFocusMode(this.defaultMode);
  } else {
    var nextFocusMode = this.getNextFocusMode(this.defaultMode);
    if (nextFocusMode) {
      this.selectedModes[nextFocusMode].enable();
      this.setCurrentFocusMode(nextFocusMode);
    }
  }
};

focusmodeController.prototype.getNextFocusMode =
 function(focusMode) {
  var nextFocusMode = this.focusModes[focusMode].next;
  if (nextFocusMode && this.selectedModes[nextFocusMode]) {
    return nextFocusMode;
  } else if(nextFocusMode) {
    this.getNextFocusMode(nextFocusMode);
  }
  return null;
};


/**
* Set default focus mode as continuous Auto.
* Later when Face tracking is landed the default
* mode will be changed to Face tracking mode on availability.
**/
focusmodeController.prototype.setContinuousFocusMode = function() {
  var self = this;
  // Start continuous Auto Focus mode
  self.camera.setContinuousAutoFocus();
  // Enable Gecko callbacks of success
  self.camera.enableAutoFocusMove();
};

 /**
 * Start with face detection as default
 * Focus Mode
 */
focusmodeController.prototype.setFaceFocusMode = function() {
  this.focusRing.clearFaceRings();
  this.camera.startFaceDetection();
};

focusmodeController.prototype.disableFaceTracking = function() {
  this.camera.stopFaceDetection();
};

focusmodeController.prototype.disableContinuousFocus = function() {
  this.camera.disableAutoFocusMove();
 // this.camera.disableContinuousFocus();
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
  if (this.focusTimeOut) {
    clearTimeout(this.focusTimeOut);
    this.focusTimeOut = null;
  }
  // TODO : diable Face tracking, C-AF and clear preview rings
  //this.resetFocusModes(focusmode);
  //this.camera.disableAutoFocusMove();
  this.disableCurrentMode('touchFocus');
  this.setCurrentFocusMode('touchFocus');
  this.focusRing.clearFaceRings();
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
  self.focusTimeOut = setTimeout(function() {
      self.camera.set('focus', 'none');
      self.resetFocusRingPosition();
      self.setDefaultFocusmode();
    }, 3000);
  }
};

/**
* Reset focus ring position to center
* on completing touch focus.
**/
focusmodeController.prototype.resetFocusRingPosition = function() {
  this.focusRing.clearFaceRings();
  var x = this.viewfinder.el.clientWidth / 2;
  var y = this.viewfinder.el.clientHeight / 2;
  // change focus ring positon
  this.focusRing.changePosition(x, y);
};

 /**
 * On detecting atleast one face,
 * gecko send success callback.
 *
 * @param {faces} object
 * All the face coordinates are in
 * camera coordinates (-1000 to 1000).
 * These values need to mapped to
 * pixels.
 */
focusmodeController.prototype.onFacedetected = function(faces) {
  // Local Variables
  var maxID = -1;
  var maxArea = 0;
  var area = 0;
  var i = 0;
  var self = this;
  var mainFace = null;
  var transformedFaces = [];

  //if (this.faceDisable) { return; }
  if (this.focusTimeOut) {
    clearTimeout(this.focusTimeOut);
    this.focusTimeOut = null;
  }
  this.faceDisable = true;
  // clear any previous focus rings
  this.focusRing.clearFaceRings();
  this.disableCurrentMode('faceTracking');
  this.setCurrentFocusMode('faceTracking');
  // finding scaling factor
  var sw = this.viewfinder.els.frame.clientWidth / 2000;
  var sh = this.viewfinder.els.frame.clientHeight / 2000;

  // Convert the face values which are
  // in camera coordinate system to
  // pixels.
  for (i = 0; i < faces.length; i++) {
    // Neglect the faces with
    // low confidence.
    if (faces[i].score < this.minFaceScore) {
      continue;
    }
    var width = Math.abs(faces[i].bounds.right - faces[i].bounds.left);
    var height = Math.abs(faces[i].bounds.bottom - faces[i].bounds.top);
    area = width * height;
    var px = Math.round(faces[i].bounds.left * sw);
    var py = Math.round((-1) * ((faces[i].bounds.bottom +
      faces[i].bounds.top) / 2) * sh);
    var radius = Math.round(((width + height) / 2) * sw);

    transformedFaces[i] = {
      pointX: px,
      pointY: py,
      length: radius,
      index: i
    };
    // Find face which has maximum area
    // to focus on.
    if (area > maxArea) {
      maxArea = area;
      maxID = i;
      mainFace = transformedFaces[i];
    }

  }
  // remove maximum area face from the array.
  if (maxID > -1) {
    transformedFaces.splice(maxID, 1);
  }
  // For the face which has to be focused
  this.focusRing.setMaxID(mainFace);
  var k = 0;
  // For all other detected faces.
  while (transformedFaces[k]) {
    this.focusRing.tranformRing(
      transformedFaces[k].pointX,
      transformedFaces[k].pointY,
      transformedFaces[k].length,
      transformedFaces[k].index
    );
    k++;
  }
  var currentTime = new Date().getTime() / 1000;
  if ((currentTime - this.lastEventTime) < 3) {
    return;
  }
  this.lastEventTime = currentTime;

  // set focusing and metering areas
  this.camera.setFocusArea(faces[maxID].bounds);
  this.camera.setMeteringArea(faces[maxID].bounds);

  // Call auto focus to focus on focus area.
  this.camera.focus(focusDone);

  // show focussed ring when focused
  function focusDone() {
    // clear ring UI.
    // Timeout is needed to show the focused ring.
    setTimeout(function() {
      self.camera.set('focus', 'none');
      self.faceDisable = false;
    }, 1000);
  }

  this.focusTimeOut = setTimeout(function() {
      self.camera.set('focus', 'none');
      self.faceDisable = false;
      self.resetFocusRingPosition();
      self.setDefaultFocusmode();
    }, 3000);
};

focusmodeController.prototype.setCurrentFocusMode = function(mode) {
  this.focus.get('currentMode').mode = mode;
  this.camera.set('focusMode', mode);
};

focusmodeController.prototype.getCurrentFocusMode = function() {
  return this.focus.get('currentMode').mode;
};

focusmodeController.prototype.disableCurrentMode = function(nextMode) {
  if (this.selectedModes[this.getCurrentFocusMode()].disabled) {
    this.selectedModes[this.getCurrentFocusMode()].disabled();
  }
  if (nextMode !== 'faceTracking' &&
     this.selectedModes.faceTracking) {
    if (this.camera.checkFaceTrackingState()) {
      this.selectedModes.faceTracking.disable();
    }
  }
};

focusmodeController.prototype.checkfaceTrackingState = function() {
  if (this.selectedModes.faceTracking) {
    if (!this.camera.checkFaceTrackingState()) {
      this.selectedModes.faceTracking.enable();
    }
  }
};

});