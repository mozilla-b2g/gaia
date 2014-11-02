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
 * This state would guarantee the LockScreen plays the animation.
 */
(function(exports) {

  var LockScreenStateKeypadHiding = function() {
    LockScreenBaseState.apply(this, arguments);
  };
  LockScreenStateKeypadHiding.prototype =
    Object.create(LockScreenBaseState.prototype);

  LockScreenStateKeypadHiding.prototype.start = function(lockScreen) {
    this.type = 'keypadHiding';
    this.lockScreen = lockScreen;
    return this;
  };

  LockScreenStateKeypadHiding.prototype.transferTo =
  function lsskh_transferTo() {
    return new Promise((resolve, reject) => {
      // Copy from the original switching method.
      this.lockScreen.overlay.classList.remove('no-transition');
      // Trigger the transition.
      this.lockScreen.overlay.dataset.panel = 'main';
      window.dispatchEvent(
        new CustomEvent('lockscreen-request-inputpad-close'));
      // XXX: We need a overall refactoring about panel and
      // panel styling in the future.
      this.lockScreen.overlay.classList.remove('passcode-unlocking');
      // XXX: We assume this is sync in order. But if we use real
      // input window this would be broken.
      resolve();
    });
  };
  exports.LockScreenStateKeypadHiding = LockScreenStateKeypadHiding;
})(window);
