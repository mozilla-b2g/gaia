define(function(require, exports, module) {
'use strict';

/**
 * Exports
 */

module.exports = Focus;

/**
 * Options:
 *
 *   - {Boolean} `continousAutoFocus`
 *   - {Boolean} `touchFocus`
 *   - {Boolean} `faceTracking`
 */
function Focus(options) {
  this.userPreferences = options || {};
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

  mozCamera.focusMode = focusMode;
};

/**
 *  Configures focus modes based on user preferences
 *  and hardware availability
 */
Focus.prototype.configureFocusModes = function() {
  var userPreferences = this.userPreferences;
  var continuousAutoFocusEnabled = true;
  var touchFocusUserEnabled = userPreferences.touchFocus;
  var touchFocusSupported = this.isTouchFocusSupported();

  // User preferences overrided defaults
  if (userPreferences.continuousAutoFocus !== undefined) {
    continuousAutoFocusEnabled = userPreferences.continuousAutoFocus;
  }
  this.touchFocus = touchFocusUserEnabled && touchFocusSupported;
  this.continuousAutoFocus = continuousAutoFocusEnabled;
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
  var focusMode = this.mozCamera.focusMode;

  // It there's already a timer to go back to continuous focus we restart it
  if (this.continuousModeTimer) {
    startContinousModeTimer();
  }

  if (focusMode === 'continuous-picture' || focusMode === 'continuous-video') {
    this.previousFocusMode = focusMode;
    focusMode = 'auto';
    this.mozCamera.focusMode = focusMode;
    startContinousModeTimer();
  }

  function startContinousModeTimer() {
    clearTimeout(self.continuousModeTimer);
    self.continuousModeTimer = setTimeout(switchToContinuousMode, 10000);
  }

  function switchToContinuousMode(){
    self.mozCamera.focusMode = self.previousFocusMode;
    self.mozCamera.resumeContinuousFocus();
  }

  if (focusMode !== 'auto') {
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

Focus.prototype.resume = function() {
  if (this.mozCamera.focusMode === 'continuous-picture') {
    this.mozCamera.resumeContinuousFocus();
  }
};

/**
 *  Check if the hardware supports touch to focus
 */
Focus.prototype.isTouchFocusSupported = function() {
  var maxFocusAreas = this.mozCamera.capabilities.maxFocusAreas;
  var maxMeteringAreas = this.mozCamera.capabilities.maxMeteringAreas;
  return maxFocusAreas > 0 && maxMeteringAreas > 0;
};

Focus.prototype.updateFocusArea = function(rect, done) {
  var flashMode = this.mozCamera.flashMode;
  var self = this;

  if (!this.touchFocus) {
    return;
  }

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
    // Restores previous flash mode
    self.mozCamera.flashMode = flashMode;
    done(state);
  }

};

});