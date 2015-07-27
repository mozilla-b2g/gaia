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

/* global Promise, LockScreenBaseState */

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

  LockScreenStateSlideShow.prototype.start = function(lockScreen, setups) {
    this.type = 'slideShow';
    this.lockScreen = lockScreen;
    this.setups = setups;
    return this;
  };

  LockScreenStateSlideShow.prototype.transferTo =
  function lssss_transferTo(inputs) {
    this._passcodeEnabled = inputs.passcodeEnabled;
    // Must make sure this state happens after LockScreen bootstraps itself.
    // Since it's an async bootstrapping process.
    return this.lockScreen.bootstrapping.then(() => {
      return new Promise((resolve, reject) => {
        // Clear passcode while the keypad is hiding.
        window.dispatchEvent(
          new CustomEvent('lockscreen-request-inputpad-close'));
        // Resetting slider before we want to show it again
        this.lockScreen._unlocker.reset();
        // Copy from the original switching method.
        this.lockScreen.overlay.classList.add('no-transition');
        this.lockScreen.overlay.dataset.panel = 'main';
        resolve();
      });
    });
  };

  LockScreenStateSlideShow.prototype.transferOut =
  function lssss_transferOut() {
    // Stop the unlock when the state want to transfer out.
    return Promise.resolve().then(() => {
        // If we need to read the passcode enabled value:
        // 1. Since we need to wait reading, stop it to prevent advanced
        //    user manipulations
        // 2. Until we read it, resume the unlocker to prevent we forget
        //    to resume it.
        //
        // Else, we just ignore it.
        this.lockScreen._unlocker._stop();

        if ('undefined' === typeof this._passcodeEnabled) {
          // No need such value, pass by.
          this.lockScreen._unlocker._start();
        } else if (null !== this._passcodeEnabled) {
          // Already read it.
          this.lockScreen._unlocker._start();
        } else {
          // Need to wait it.
          return this.setups.passcodeEnabledRead.promise.then((enabled) => {
            this.lockScreen._unlocker._start();
          });
        }
      });
  };

  exports.LockScreenStateSlideShow = LockScreenStateSlideShow;
})(window);
