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
 * If we follow the ordinary unlocking logic, that is, no need to care about
 * instantly unlock and activity, we need to integrate the unlocking function
 * call into state to coordinate the relationships between panel switching and
 * unlocking animation.
 */
(function(exports) {

  var LockScreenStateWaitPasscodeEnabledRead = function() {
    LockScreenBaseState.apply(this, arguments);
  };
  LockScreenStateWaitPasscodeEnabledRead.prototype =
    Object.create(LockScreenBaseState.prototype);

  LockScreenStateWaitPasscodeEnabledRead.prototype.start =
  function(lockScreen, waitingRequirement) {
    this.type = 'waitPasscodeEnabledRead';
    this.lockScreen = lockScreen;
    this.waitingRequirement = waitingRequirement;
    return this;
  };

  // XXX: We just make a dummy state that remains our current architecture,
  // so we could hotfix Bug 1173284 without a complete rewriting.
  LockScreenStateWaitPasscodeEnabledRead.prototype.transferTo =
  function lsswper_transferTo(inputs) {
    // XXX: Since to read mozSettings like this would take a long time,
    // we need to block related manipulations until it got read.
    return this.lockScreen.bootstrapping.then(() => {
        this.lockScreen._unlocker._stop();
      }).then(() => {
        return this.waitingRequirement.promise.then((enabled) => {
          this.lockScreen._unlocker._start();
          // To trigger the event again with the correct passcode enabled value.
          inputs.passcodeEnabled = enabled;
        });
      }).then(() => {
        return inputs;
      });
  };
  exports.LockScreenStateWaitPasscodeEnabledRead =
    LockScreenStateWaitPasscodeEnabledRead;
})(window);
