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

  var LockScreenStateSlideRestore = function() {
    LockScreenBaseState.apply(this, arguments);
  };
  LockScreenStateSlideRestore.prototype =
    Object.create(LockScreenBaseState.prototype);

  LockScreenStateSlideRestore.prototype.start = function(lockScreen) {
    this.type = 'slideRestore';
    this.lockScreen = lockScreen;
    return this;
  };

  LockScreenStateSlideRestore.prototype.transferTo =
  function lssss_transferTo(inputs) {
    return new Promise((resolve, reject) => {
      this.lockScreen._unlocker.reset();
      resolve();
    });
  };
  exports.LockScreenStateSlideRestore = LockScreenStateSlideRestore;
})(window);

