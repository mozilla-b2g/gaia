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

  var LockScreenStatePanelHide = function() {
    LockScreenBaseState.apply(this, arguments);
  };
  LockScreenStatePanelHide.prototype =
    Object.create(LockScreenBaseState.prototype);

  LockScreenStatePanelHide.prototype.start = function(lockScreen) {
    this.type = 'panelHide';
    this.lockScreen = lockScreen;
    return this;
  };

  LockScreenStatePanelHide.prototype.transferTo =
  function lssph_transferTo() {
    return new Promise((resolve, reject) => {
      // Copy from the original switching method.
      this.lockScreen.overlay.classList.add('no-transition');
      // XXX: clear the passcode we entered.
      // To have 'passcodeStatus' would make UI don't update.
      delete this.lockScreen.overlay.dataset.passcodeStatus;
      this.lockScreen.passCodeEntered = '';
      this.lockScreen.updatePassCodeUI();
      // XXX: even though we set the no-transition, it still do transition.
      this.lockScreen.overlay.dataset.panel = 'passcode';
      this.lockScreen.overlay.dataset.passcodeStatus = 'success';
      resolve();
    });
  };
  exports.LockScreenStatePanelHide = LockScreenStatePanelHide;
})(window);
