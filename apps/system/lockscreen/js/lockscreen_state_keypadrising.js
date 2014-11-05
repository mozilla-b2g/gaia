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

  var LockScreenStateKeypadRising = function() {
    LockScreenBaseState.apply(this, arguments);
  };
  LockScreenStateKeypadRising.prototype =
    Object.create(LockScreenBaseState.prototype);

  LockScreenStateKeypadRising.prototype.start = function(lockScreen) {
    this.type = 'keypadRising';
    this.lockScreen = lockScreen;
    return this;
  };

  LockScreenStateKeypadRising.prototype.transferTo =
  function lsskr_transferTo(inputs) {
    return new Promise((resolve, reject) => {
      // XXX: Because when it's 'success', the keyboard would be hidden.
      // This should be fixed: we should manage the show/hide with other
      // CSS flags.
      this.lockScreen.overlay.dataset.passcodeStatus = '';
      this.lockScreen.overlay.dataset.panel = 'passcode';
      // XXX: Before it become a real input window.
      window.dispatchEvent(
        new CustomEvent('lockscreen-request-inputpad-open'));
      // XXX: We need a overall refactoring about panel and
      // panel styling in the future.
      this.lockScreen.overlay.classList.add('passcode-unlocking');
      resolve();
    });
  };
  exports.LockScreenStateKeypadRising = LockScreenStateKeypadRising;
})(window);
