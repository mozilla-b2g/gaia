/**
  Copyright 2012, Mozilla Foundation

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

/* global LockScreenBaseState */

'use strict';

/**
 * This state would guarantee the LockScreen shows the slide.
 */
(function(exports) {

  var LockScreenStateSlideShow = function() {
    LockScreenBaseState.apply(this, arguments);
  };
  LockScreenStateSlideShow.prototype =
    Object.create(LockScreenBaseState.prototype);

  LockScreenStateSlideShow.prototype.start = function(lockScreen) {
    this.type = 'slideShow';
    this.lockScreen = lockScreen;
    this.lockScreen.nextStep(() => {
      this.stopWhenActivated(this.lockScreen._unlocker);
    });
    return this;
  };

  /**
   * Slider should be stopped until the manager do
   * the decision to transfer to which state. And we
   * stop it because the slideshow is the only state
   * that shows the slider, so to stop it before doing
   * any decision.
   **/
  LockScreenStateSlideShow.prototype.stopWhenActivated =
  function lssss_stopWhenActivated(unlocker) {
    var stopIt = function stopIt() {
      unlocker._stop();
      window.removeEventListener('lockscreenslide-activate-left', stopIt);
      window.removeEventListener('lockscreenslide-activate-right', stopIt);
    };
    window.addEventListener('lockscreenslide-activate-left', stopIt);
    window.addEventListener('lockscreenslide-activate-right', stopIt);
  };

  LockScreenStateSlideShow.prototype.transferTo =
  function lssss_transferTo(inputs) {
    // Only when the lockscreen is ready, we do the things.
    return this.lockScreen.nextStep(() => {
      var unlocker = this.lockScreen._unlocker;
      // Clear passcode while the keypad is hiding.
      window.dispatchEvent(
        new CustomEvent('lockscreen-request-inputpad-close'));
      // Resetting slider before we want to show it again
      unlocker.reset();
      // Start it because the slideshow is the only state
      // that shows the slider, so start it here.
      unlocker._start();

      // Copy from the original switching method.
      this.lockScreen.overlay.classList.add('no-transition');
      this.lockScreen.overlay.dataset.panel = 'main';
    });
  };

  exports.LockScreenStateSlideShow = LockScreenStateSlideShow;
})(window);
