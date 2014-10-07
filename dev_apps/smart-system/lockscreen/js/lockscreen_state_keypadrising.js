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
 * This state would guarantee the LockScreen plays the animation.
 */
(function(exports) {

  var LockScreenStateKeypadRising = function() {};
  LockScreenStateKeypadRising.prototype.start = function(lockScreen) {
    this.type = 'keypadRising';
    this.lockScreen = lockScreen;
    return this;
  };

  LockScreenStateKeypadRising.prototype.transferTo =
  function lsskr_transferTo(inputs) {
    return new Promise((resolve, reject) => {
      var transitionEnd = (evt) => {
        // XXX: keyboard animation would affect panel, but the target would
        // not be 'this.lockScreen.overlay'.
        if (evt.target.classList.contains('lockscreen-panel')) {
          window.removeEventListener('transitionend', transitionEnd);
          // We must map this native event to avoid listen 'transitionend'
          // in the manager cause racing problem (the event and transferring
          // done event).
          resolve( {'transitionEnd': true} );
        }
      };
      // Copy from the original switching method.
      this.lockScreen.overlay.classList.remove('no-transition');
      window.addEventListener('transitionend', transitionEnd);
      // Trigger the transition.
      this.lockScreen.overlay.dataset.panel = 'passcode';
      // XXX: Because when it's 'success', the keyboard would be hidden.
      // This should be fixed: we should manage the show/hide with other
      // CSS flags.
      this.lockScreen.overlay.dataset.passcodeStatus = '';
    });
  };
  exports.LockScreenStateKeypadRising = LockScreenStateKeypadRising;
})(window);
