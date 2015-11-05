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
 * A state represents the mode Secure app launching and launched.
 */
(function(exports) {

  var LockScreenStateSecureAppLaunching = function() {
    LockScreenBaseState.apply(this, arguments);
  };
  LockScreenStateSecureAppLaunching.prototype =
    Object.create(LockScreenBaseState.prototype);

  LockScreenStateSecureAppLaunching.prototype.start = function(lockScreen) {
    this.type = 'secureAppLaunching';
    this.lockScreen = lockScreen;
    return this;
  };

  LockScreenStateSecureAppLaunching.prototype.transferTo =
  function lsskh_transferTo(inputs) {
    return new Promise((resolve, reject) => {
      this.lockScreen.invokeSecureApp(inputs.appName);
      resolve();
    });
  };
  exports.LockScreenStateSecureAppLaunching = LockScreenStateSecureAppLaunching;
})(window);
