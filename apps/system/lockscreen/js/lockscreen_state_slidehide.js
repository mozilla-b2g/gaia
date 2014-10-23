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

  var LockScreenStateSlideHide = function() {
    LockScreenBaseState.apply(this, arguments);
  };
  LockScreenStateSlideHide.prototype =
    Object.create(LockScreenBaseState.prototype);


  LockScreenStateSlideHide.prototype.start = function lsssh_start(lockScreen) {
    this.type = 'slideHide';
    this.lockScreen = lockScreen;
    return this;
  };

  LockScreenStateSlideHide.prototype.transferTo =
  function lsssh_transferTo() {
    return Promise.resolve();
  };
  exports.LockScreenStateSlideHide = LockScreenStateSlideHide;
})(window);
