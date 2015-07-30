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

Focus.prototype.configure = function(mozCamera, mode) {
  var focusModes = mozCamera.capabilities.focusModes;
  var focusMode;
  this.mozCamera = mozCamera;
  this.configureFocusModes(mode);
  // Determines focus mode based on camera mode
  // In case of C-AF enabled
  if (this.continuousAutoFocus) {
    if (mode === 'picture') {
      focusMode = 'continuous-picture';
    } else if (mode === 'video'){
      focusMode = 'continuous-video';
    }
  }

  // auto is the default focus mode
  focusMode = focusMode || 'auto';

  // If auto or passed mode is not supported we pick the
  // first available in the hardware list
  if (focusModes.indexOf(focusMode) === -1) {
    focusMode = focusModes[0];
  }

  // If touch-to-focus is in progress we need to ensure
  // the correct mode is restored when it is complete
  this.suspendedMode = focusMode;
  mozCamera.focusMode = focusMode;
  this.reboot();
};

Focus.prototype.getMode = function() {
  var mozCamera = this.mozCamera;
  return this.suspendedMode || mozCamera.focusMode;
};

/**
 *  Configures focus modes based on user preferences
 *  and hardware availability
 */
Focus.prototype.configureFocusModes = function(mode) {
  var userPreferences = this.userPreferences;
  var continuousAutoFocusUserEnabled =
    userPreferences.continuousAutoFocus !== false;
  var touchFocusUserEnabled = userPreferences.touchFocus;
  var touchFocusSupported = this.isTouchFocusSupported();
  var faceDetectionUserEnabled = userPreferences.faceDetection;
  var faceDetectionSupported = this.isFaceDetectionSupported();
  this.continuousAutoFocus = continuousAutoFocusUserEnabled;
  // User preferences override defaults
  this.touchFocus = touchFocusUserEnabled && touchFocusSupported;
  // Face detection only enabled on picture mode (disabled on video)
  this.faceDetection =
    faceDetectionUserEnabled && faceDetectionSupported && mode === 'picture';
  this.mozCamera.addEventListener('focus', this.onAutoFocusStateChange);
};

Focus.prototype.startFaceDetection = function() {
  if (!this.faceDetection) { return; }
  this.mozCamera.addEventListener('facesdetected',
    this.handleFaceDetectionEvent);
  this.mozCamera.startFaceDetection();
};

Focus.prototype.stopFaceDetection = function() {
  // Clear suspenstion timers
  clearTimeout(this.faceDetectionSuspended);
  clearTimeout(this.faceDetectionSuspensionTimer);
  if (this.mozCamera.stopFaceDetection) {
    this.mozCamera.removeEventListener('facesdetected',
      this.handleFaceDetectionEvent);
    this.mozCamera.stopFaceDetection();
  }
  this.clearFaceDetection();
};

Focus.prototype.handleFaceDetectionEvent = function(e) {
  this.focusOnLargestFace(e.faces);
};

Focus.prototype.clearFaceDetection = function() {
  this.focusOnLargestFace([]);
};

Focus.prototype.suspendFaceDetection = function(ms, delay) {
  if (!this.faceDetection) {
    return;
  }
  var self = this;
  delay = delay || 0;
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
    this.suspendedMode = this.mozCamera.focusMode;
    this.mozCamera.focusMode = 'auto';
  }
};

Focus.prototype.resumeContinuousFocus = function() {
  this.mozCamera.focusMode = this.suspendedMode;
  this.suspendedMode = null;
  this.resetFocusAreas();
  this.mozCamera.resumeContinuousFocus();
};

Focus.prototype.suspendContinuousFocus = function(ms) {
  clearTimeout(this.continuousModeTimer);
  this.stopContinuousFocus();
  this.continuousModeTimer = setTimeout(this.resumeContinuousFocus, ms);
};

Focus.prototype.updateFocusState = function(state) {
  // Only update if the state has changed, and only transition to focused
  // or unfocused if we were previously focusing; this eliminates unfocused
  // rings just before a focusing state change.
  if (this.focusState !== state &&
      (this.focusState === 'focusing' || state === 'focusing')) {
    this.focusState = state;
    this.onAutoFocusChanged(state);
  }
};

Focus.prototype.onAutoFocusStateChange = function(e) {
  var state = e.newState;
  if (state === 'unfocused') {
    state = 'fail';
  }
  this.updateFocusState(state);
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
  if (!this.mozCamera) { return; }
  done = done || function() {};
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
  this.updateFocusState('focusing');
  this.mozCamera.autoFocus().then(onSuccess, onError);

  // If focus fails with an error, we still need to signal the
  // caller. Interruptions are a special case, but other errors
  // can be treated the same as completing the operation but
  // remaining unfocused.
  function onError(err) {
    self.focused = false;
    if (err.name === 'NS_ERROR_IN_PROGRESS') {
      done('interrupted');
    } else {
      done('error');
    }
  }

  // This is fixed focus: there is nothing we can do here so we
  // should just call the callback and take the photo. No focus
  // happens so we don't display a focus ring.
  function onSuccess(success) {
    if (success) {
      self.focused = true;
      done('focused');
    } else {
      self.focused = false;
      done('failed');
    }
  }
};

/**
 * Resets focus regions
 */
Focus.prototype.resetFocusAreas = function() {
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
  delete this.focusState;
};

Focus.prototype.resume = function() {
  if (!this.paused) { return; }
  this.resumeContinuousFocus();
  this.startFaceDetection();
  this.paused = false;
};

Focus.prototype.reboot = function() {
  this.pause();
  this.resume();
};

/**
 *  Check if the hardware supports touch to focus
 */
Focus.prototype.isTouchFocusSupported = function() {
  var maxFocusAreas = this.mozCamera.capabilities.maxFocusAreas;
  return maxFocusAreas > 0;
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
  done = done || function() {};
  if (!this.touchFocus) {
    done('touchToFocusNotAvailable');
    return;
  }
  this.updateFocusState('focusing');
  this.stopContinuousFocus();
  this.suspendFaceDetection(10000);
  this.mozCamera.setFocusAreas([rect]);
  this.mozCamera.setMeteringAreas([rect]);
  // Call auto focus to focus on focus area.
  this.focus(done);
};

});
