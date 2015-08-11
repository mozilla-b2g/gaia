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
 * If we follow the ordinary unlocking logic, that is, no need to care about
 * instantly unlock and activity, we need to integrate the unlocking function
 * call into state to coordinate the relationships between panel switching and
 * unlocking animation.
 */
(function(exports) {

  var LockScreenStateUnlock = function() {
    LockScreenBaseState.apply(this, arguments);
  };
  LockScreenStateUnlock.prototype =
    Object.create(LockScreenBaseState.prototype);

  LockScreenStateUnlock.prototype.start = function(lockScreen, innerStates) {
    this.type = 'unlock';
    this.lockScreen = lockScreen;
    this.innerStates = innerStates;
    return this;
  };

  LockScreenStateUnlock.prototype.transferTo =
  function lsskh_transferTo(inputs) {
    return new Promise((resolve, reject) => {
      var unlockingDetails = {
        'unlockSoundEnabled': this.innerStates.unlockSoundEnabled
      };
      if (inputs.unlockingAppActivated) {
        this.lockScreen._activateUnlockingCamera(unlockingDetails);
      } else {
        this.lockScreen.unlock(false, unlockingDetails);
      }
      resolve();
    });
  };
  exports.LockScreenStateUnlock = LockScreenStateUnlock;
})(window);
