/**
 Copyright 2015, Mozilla Foundation

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

'use strict';

/**
 * LockScreen's handling of the power button is implemented here.
 */
(function(exports) {

  var LockScreenPowerbuttonManager = function() {
    /**
     * Boolean value to track state of locksckscreen.enabled setting.
     * We must default to false here to ensure that a potential race condition
     * with the settings observer never results in a permanently locked device.
     */
    this.lockScreenEnabled = false;
    /** String value defining power button behavior. Currently implemented:
     * - 'screen-lock': default behavior of just locking the screen
     * - 'passcode-lock': locks and immediately requires pass code on unlock
     * Only settings listener should change this value to sync with data
     * in Settings API.
     */
    this.buttonBehavior = 'screen-lock';
  };

  LockScreenPowerbuttonManager.prototype.start =
    function lspm_start() {
      window.SettingsListener.observe(
        'lockscreen.passcode-lock.powerbutton-behavior',
        'screen-lock', (function(value) {
          this.setPowerbuttonLockBehavior(value);
        }).bind(this));
      window.SettingsListener.observe(
        'lockscreen.enabled',
        'screen-lock', (function(value) {
          this.setLockScreenEnabled(value);
        }).bind(this));
      window.addEventListener('sleep', this);
      return this;
    };

  /**
   * The sleep handler hooks the 'sleep' event which is sent by the
   * key manager when the power button is pressed, and it extends it
   * by emitting a 'lockscreen.lock-immediately' pseudo event through
   * settings when lockscreen is anabled and behavior is 'passcode-lock'.
   */
  LockScreenPowerbuttonManager.prototype.handleEvent =
    function lspm_handleEvent(evt) {
      switch (evt.type) {
        case 'sleep':
          var lockEnabled = this.lockScreenEnabled;
          var powerPasscodeEnabled =
            (this.buttonBehavior === 'passcode-lock');
          if (lockEnabled && powerPasscodeEnabled) {
            // FIXME(cr) this is currently used by Find My Device to force
            // locking.
            // Should be replaced by a proper IAC API in bug 992277.
            return window.SettingsListener.getSettingsLock().set({
              'lockscreen.lock-immediately': true
            });
          }
      }
    };

  /**
   * Value setter for the behavior settings observer. It interprets
   * everything that is not 'passcode-lock' as the default behavior
   * 'screen-lock'.
   */
  LockScreenPowerbuttonManager.prototype.setPowerbuttonLockBehavior =
    function lspm_setPowerButtonLocksEnabled(value) {
      switch (value) {
        case 'passcode-lock':
          this.buttonBehavior = 'passcode-lock';
          break;
        default:
          this.buttonBehavior = 'screen-lock';
      }
    };

  /**
   * Value setter for the lockscreen.enabled settings observer. It
   * interprets everything that is not true as its default false.
   */
  LockScreenPowerbuttonManager.prototype.setLockScreenEnabled =
    function lspm_setLockScreenEnabled(value) {
      if (typeof value === 'boolean') {
        switch (value) {
          case true:
            this.lockScreenEnabled = true;
            break;
          default:
            this.lockScreenEnabled = false;
        }
      } else {
        this.lockScreenEnabled = false;
      }
    };

  exports.LockScreenPowerbuttonManager = LockScreenPowerbuttonManager;
})(window);
