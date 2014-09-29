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

/* global Promise */

'use strict';

/**
 * This state would guarantee the LockScreen is showing with the keypad.
 */
(function(exports) {

  var LockScreenStateKeypadShow = function() {};
  LockScreenStateKeypadShow.prototype.start = function(lockScreen) {
    this.type = 'keypadShow';
    this.lockScreen = lockScreen;
    return this;
  };

  LockScreenStateKeypadShow.prototype.transferTo =
  function lssks_transferTo() {
    return new Promise((resolve, reject) => {
      // Copy from the original switching method.
      this.lockScreen.overlay.classList.add('no-transition');
      this.lockScreen.overlay.dataset.panel = 'passcode';
      // Resetting slider when it get hidden by the passcode keypad
      this.lockScreen._unlocker.reset();
      // XXX: Because when it's 'success', the keyboard would be hidden.
      // This should be fixed: we should manage the show/hide with other
      // CSS flags.
      this.lockScreen.overlay.dataset.passcodeStatus = '';
      resolve();
    });
  };
  exports.LockScreenStateKeypadShow = LockScreenStateKeypadShow;
})(window);
