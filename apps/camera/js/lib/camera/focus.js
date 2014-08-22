define(function(require, exports, module) {
'use strict';

/**
 * Module Dependencies
 */

var bindAll = require('lib/bind-all');

/**
 * Exports
 */

module.exports = Focus;

/**
 * Options:
 *
 *   - {Boolean} `continousAutoFocus`
 *   - {Boolean} `touchFocus`
 *   - {Boolean} `faceDetection`
 */
function Focus(options) {
  bindAll(this);
  this.userPreferences = options || {};
  this.detectedFaces = [];
}

Focus.prototype.configure = function(mozCamera, focusMode) {
  var focusModes = mozCamera.capabilities.focusModes;
  this.mozCamera = mozCamera;
  this.configureFocusModes();

  // User preferences override defaults
  if (focusMode === 'continuous-picture' ||
      focusMode === 'continuous-video') {
    if (!this.continuousAutoFocus) {
      focusMode = 'auto';
    }
  }

  // auto is the default focus mode
  focusMode = focusMode || 'auto';

  // If auto or passed mode is not supported we pick the
  // first available in the hardware list
  if (focusModes.indexOf(focusMode) === -1) {
    focusMode = focusModes[0];
  }

  this.setMode(focusMode);

};

Focus.prototype.getMode = function() {
  return this.mode;
};

Focus.prototype.setMode = function(mode) {
  var mozCamera = this.mozCamera;
  this.previousMode = this.mode;
  mozCamera.focusMode = this.mode = mode;
  this.reset();
  return mode;
};

Focus.prototype.restoreMode = function() {
  var mode = this.setMode(this.previousMode);
  return mode;
};

/**
 *  Configures focus modes based on user preferences
 *  and hardware availability
 */
Focus.prototype.configureFocusModes = function() {
  var userPreferences = this.userPreferences;
  var continuousAutoFocusUserEnabled =
    userPreferences.continuousAutoFocus !== false;
  var touchFocusUserEnabled = userPreferences.touchFocus;
  var touchFocusSupported = this.isTouchFocusSupported();
  var faceDetectionUserEnabled = userPreferences.faceDetection;
  var faceDetectionSupported = this.isFaceDetectionSupported();
  // User preferences override defaults
  this.touchFocus = touchFocusUserEnabled && touchFocusSupported;
  this.faceDetection = faceDetectionUserEnabled && faceDetectionSupported;
  this.continuousAutoFocus = continuousAutoFocusUserEnabled;
  if (this.faceDetection) {
    this.startFaceDetection();
  }
  this.mozCamera.onAutoFocusMoving = this.onAutoFocusMoving;
};

Focus.prototype.startFaceDetection = function() {
  if (this.faceDetection) {
    this.mozCamera.onFacesDetected = this.focusOnLargestFace;
    this.mozCamera.startFaceDetection();
  }
};

Focus.prototype.stopFaceDetection = function() {
  // Clear suspenstion timers
  clearTimeout(this.faceDetectionSuspended);
  clearTimeout(this.faceDetectionSuspensionTimer);
  if (this.faceDetection) {
    this.mozCamera.stopFaceDetection();
    this.clearFaceDetection();
  }
};

Focus.prototype.clearFaceDetection = function() {
  if (this.faceDetection) {
    this.focusOnLargestFace([]);
  }
};

Focus.prototype.suspendFaceDetection = function(ms, delay) {
  var self = this;
  clearTimeout(this.faceDetectionSuspended);
  clearTimeout(this.faceDetectionSuspensionTimer);
  this.faceDetectionSuspensionTimer = setTimeout(suspendFaceDetection, delay);
  function suspendFaceDetection() {
    self.faceDetectionSuspended = setTimeout(clearTimer, ms);
  }
  function clearTimer() {
    self.faceFocused = false;
    self.faceDetectionSuspended = undefined;
  }
};

Focus.prototype.stopContinuousFocus = function() {
  var focusMode = this.mozCamera.focusMode;
  // Clear suspension timers
  clearTimeout(this.continuousModeTimer);
  if (focusMode === 'continuous-picture' || focusMode === 'continuous-video') {
    this.setMode('auto');
  }
};

Focus.prototype.resumeContinuousFocus = function() {
  this.restoreMode();
  this.mozCamera.resumeContinuousFocus();
};

Focus.prototype.suspendContinuousFocus = function(ms) {
  clearTimeout(this.continuousModeTimer);
  this.stopContinuousFocus();
  this.continuousModeTimer = setTimeout(this.resumeContinuousFocus, ms);
};

Focus.prototype.onAutoFocusMoving = function(state) {
  if (state) {
    this.onAutoFocusChanged(state);
  }
};

Focus.prototype.onAutoFocusChanged = function(state) {
  // NO OP by default
};

/**
 * Callback invoked when faces are detected
 * It's no op by default and it's meant to be overriden by
 * the user of the module in order to be informed about detected faces
 */
Focus.prototype.onFacesDetected = function(faces) {
  // NO OP by default
};

Focus.prototype.focusOnLargestFace = function(faces) {
  if (this.faceDetectionSuspended) {
    this.onFacesDetected([]);
    return;
  }

  this.detectedFaces = faces;
  this.onFacesDetected(this.detectedFaces);
};

/**
 * Focus the camera, invoke the callback asynchronously when done.
 *
 * If we only have fixed focus, then we call the callback right away
 * (but still asynchronously). Otherwise, we call autoFocus to focus
 * the camera and call the callback when focus is complete. In C-AF mode
 * this process should be fast. In manual AF mode, focusing takes about
 * a second and causes a noticeable delay before the picture is taken.
 *
 * @param  {Function} done
 * @private
 */
Focus.prototype.focus = function(done) {
  var self = this;
  this.suspendContinuousFocus(10000);
  if (this.mozCamera.focusMode !== 'auto') {
    done();
    return;
  }

  //
  // In either focus mode, we call autoFocus() to ensure that the user gets
  // a sharp picture. The difference between the two modes is that if
  // C-AF is on, it is likely that the camera is already focused, so the
  // call to autoFocus() invokes its callback very quickly and we get much
  // better response time.
  //
  // In either case, the callback is passed a boolean specifying whether
  // focus was successful or not, and we display a green or red focus ring
  // then call the done callback, which takes the picture and clears
  // the focus ring.
  //
  this.mozCamera.autoFocus(onFocused);

  // This is fixed focus: there is nothing we can do here so we
  // should just call the callback and take the photo. No focus
  // happens so we don't display a focus ring.
  function onFocused(success) {
    if (success) {
      self.focused = true;
      done();
    } else {
      self.focused = false;
      done('failed');
    }
  }
};

/**
 * Resets focus regions
 */
Focus.prototype.reset = function() {
  if (!this.touchFocus) {
    return;
  }
  this.mozCamera.setFocusAreas([]);
  this.mozCamera.setMeteringAreas([]);
};

Focus.prototype.pause = function() {
  if (this.paused) { return; }
  this.stopContinuousFocus();
  this.stopFaceDetection();
  this.paused = true;
};

Focus.prototype.resume = function() {
  if (!this.paused) { return; }
  this.resumeContinuousFocus();
  this.startFaceDetection();
  this.paused = false;
};

/**
 *  Check if the hardware supports touch to focus
 */
Focus.prototype.isTouchFocusSupported = function() {
  var maxFocusAreas = this.mozCamera.capabilities.maxFocusAreas;
  var maxMeteringAreas = this.mozCamera.capabilities.maxMeteringAreas;
  return maxFocusAreas > 0 && maxMeteringAreas > 0;
};

/**
 * Check if hardware supports face detection
 */
Focus.prototype.isFaceDetectionSupported = function() {
  var cameraDetectsFaces = this.mozCamera.capabilities.maxDetectedFaces > 0;
  var apiAvailable = !!this.mozCamera.startFaceDetection;
  this.maxDetectedFaces = this.mozCamera.capabilities.maxDetectedFaces;
  return cameraDetectsFaces && apiAvailable;
};

Focus.prototype.updateFocusArea = function(rect, done) {
  var previousFlashMode = this.mozCamera.flashMode;
  done = done || function() {};
  var self = this;
  if (!this.touchFocus) {
    done('touchToFocusNotAvailable');
    return;
  }

  this.stopFaceDetection();
  this.mozCamera.setFocusAreas([rect]);
  this.mozCamera.setMeteringAreas([rect]);
  if (this.mozCamera.focusMode === 'continuous-picture') {
    this.mozCamera.resumeContinuousFocus();
  }
  // Disables flash temporarily so it doesn't go off while focusing
  this.mozCamera.flashMode = 'off';
  // Call auto focus to focus on focus area.
  this.focus(focusDone);
  function focusDone(state) {
    self.startFaceDetection();
    self.suspendFaceDetection(2000, 0);
    // Restores previous flash mode
    self.mozCamera.flashMode = previousFlashMode;
    done(state);
  }

};

});