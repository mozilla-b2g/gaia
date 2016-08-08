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
'use strict';

/**
 * XXX: Before we use real keyboard as input pad, we need this to
 * control the custom input pad. See Bug 1053680.
 **/
(function(exports) {
  /**
   * We still need the interface to notify the LockScreen.
   *
   * @param LockScreenFaçade
   **/
  const CODE_VISIBLE_TIMEOUT = 1000;
  var passcodeTimeout;
  var LockScreenInputpad = function(lockScreen) {
    this.lockScreen = lockScreen;
    this.configs = {
      padVibrationDuration: 50
    };
    this.states = {
      // Keep in sync with Dialer and Keyboard vibration
      padVibrationEnabled: false,
      passCodeEntered: '',
      passCodeErrorTimeoutPending: false,
      isEmergencyEnabled: false
    };
  };
  LockScreenInputpad.prototype.start = function() {
    this.addEventListener('keyup', this.handleKeyEvent.bind(this));
    this.addEventListener('lockscreen-notify-passcode-validationfailed');
    this.addEventListener('lockscreen-notify-passcode-validationreset');
    this.addEventListener('lockscreen-notify-passcode-validationsuccess');
    // Need these to reset status.
    this.addEventListener('lockscreen-appclosed', this);
    this.addEventListener('lockscreen-inputappclosed', this);
    this.addEventListener('lockscreen-inputappopened', this);

    this.passcodeCode = document.getElementById('lockscreen-passcode-code');
    window.SettingsListener.observe('keyboard.vibration',
      false, (function(value) {
      this.states.padVibrationEnabled = !!value;
    }).bind(this));

    this.renderUI();
    return this;
  };

  /**
   * Rendering the whole UI, including waiting all necessary conditions.
   * So rendering functions all should be Promised.
   */
  LockScreenInputpad.prototype.renderUI = function() {
    return new Promise((resolve, reject) => {
      this.toggleEmergencyButton();
      this.updatePassCodeUI(false);
      resolve();
    });
  };

  LockScreenInputpad.prototype.toggleEmergencyButton = function() {
    if ('undefined' === typeof navigator.mozTelephony ||
        !navigator.mozTelephony) {
      this.states.isEmergencyEnabled = false;
    } else {
      this.states.isEmergencyEnabled = true;
    }
  };

  LockScreenInputpad.prototype.handleEvent = function(evt) {
    switch (evt.type) {
      // The event flow from lockscreen.js is:
      // on pass code fail:
      //   - 'validationfailed' -> (validation timeout) -> 'validationreset'
      // on pass code success:
      //   - 'validationsuccess'
      case 'lockscreen-notify-passcode-validationfailed':
        this.states.passCodeErrorTimeoutPending = true;
        this.updatePassCodeUI(false);
        break;
      case 'lockscreen-notify-passcode-validationreset':
      case 'lockscreen-notify-passcode-validationsuccess':
        // Currently both validationreset and validationsuccess
        // just need to reset Inputpad's internal state.
        this.states.passCodeEntered = '';
        this.states.passCodeErrorTimeoutPending = false;
        this.updatePassCodeUI(false);
        break;
      case 'lockscreen-inputappopened':
      case 'lockscreen-inputappclosed':
        this.updatePassCodeUI(false);
        break;
    }
  };

  LockScreenInputpad.prototype.dispatchEvent = function(evt) {
    window.dispatchEvent(evt);
  };

  LockScreenInputpad.prototype.addEventListener = function(name, cb) {
    cb = cb || this;
    window.addEventListener(name, cb);
  };

  LockScreenInputpad.prototype.removeEventListener = function(name, cb) {
    cb = cb || this;
    window.removeEventListener(name, cb);
  };

  LockScreenInputpad.prototype.updatePassCodeUI =
  function(isPassCodeEntered) {
    // isPassCodeEntered value is true if user enters the passcode else false.
    if (this.states.passCodeErrorTimeoutPending) {
      this.passcodeCode.classList.add('error');
    } else {
      this.passcodeCode.classList.remove('error');
    }
    var i = 4;
    while (i--) {
      var span = this.passcodeCode.childNodes[i];
      if (span) {
        if (this.states.passCodeEntered.length > i) {
          var value = this.states.passCodeEntered.substr(i,
            this.states.passCodeEntered.length);
          if ((this.states.passCodeEntered.length - 1 === i) &&
               isPassCodeEntered) {
            span.classList.add('current-passcode-border');
            this.startPassCodeTimeout(span, value);
          } else {
            if(!isPassCodeEntered &&
               this.states.passCodeEntered.length - 1 === i) {
              span.classList.add('current-passcode-border');
            } else {
              span.classList.remove('current-passcode-border');
            }
            span.textContent = '';
            span.dataset.dot = true;
          }
        } else {
          // clear any pending passcodeTimeout.
          clearTimeout(passcodeTimeout);
          span.classList.remove('current-passcode-border');
          span.textContent = '';
          delete span.dataset.dot;
        }
      }
    }
  };

  LockScreenInputpad.prototype.startPassCodeTimeout =
  function(currentSpan, currentValue) {
    currentSpan.textContent = currentValue;
    passcodeTimeout = setTimeout(function() {
      currentSpan.textContent = '';
      currentSpan.dataset.dot = true;
    }, CODE_VISIBLE_TIMEOUT);
  };

  LockScreenInputpad.prototype.handleKeyEvent = function(event) {
    // limit the call of 'handlePassCodeInput()' fuction for key 0-9 , 'b','c'
    // and 'e'. where keycode of 'b' is 66 and used it for deleting the code
    // entered passcode, keycode of 'c' is 67 and used it for cancel the current
    // operation and keycode for 'e' is 69 and used it to make the emergency
    // call.If user pressed 'e' button for making emergency call,
    // isEmergencyEnabled should be true.
    // this code will be modified when it is integerated with the actual
    // keyboard.
    const KEY_CODE_ZERO = 48;
    const KEY_CODE_NINE = 57;
    const KEY_CODE_B = 66;
    const KEY_CODE_C = 67;
    const KEY_CODE_E = 69;
    if ((event.keyCode >= KEY_CODE_ZERO && event.keyCode <= KEY_CODE_NINE) ||
        event.keyCode === KEY_CODE_B || event.keyCode === KEY_CODE_C ||
        (event.keyCode === KEY_CODE_E && this.states.isEmergencyEnabled)) {
      event.preventDefault();
      var key = String.fromCharCode(event.keyCode).toLowerCase();
      this.handlePassCodeInput(key);
    }
  };

  LockScreenInputpad.prototype.handlePassCodeInput =
  function(key) {
    // the last passkey should be visible before validation starts
    switch (key) {
      case 'e': // 'E'mergency Call
        this.lockScreen.invokeSecureApp('emergency-call');
        break;

      case 'c': // 'C'ancel
        this.dispatchEvent(new window.CustomEvent(
          'lockscreen-keypad-input', { detail: {
            key: key
          }
        }));
        break;

      case 'b': // 'B'ackspace for correction
        if (this.states.passCodeErrorTimeoutPending) {
          break;
        }
        this.states.passCodeEntered =
          this.states.passCodeEntered.substr(0,
            this.states.passCodeEntered.length - 1);
        this.updatePassCodeUI(false);
        break;

      default:
        if (this.states.passCodeErrorTimeoutPending) {
          break;
        }

        this.states.passCodeEntered += key;
        // limit the call of function to length of the passcode.
        if (this.states.passCodeEntered.length <= 4){
          this.updatePassCodeUI(true);
        }

        if (this.states.padVibrationEnabled) {
          navigator.vibrate(this.configs.padVibrationDuration);
        }

        if (this.states.passCodeEntered.length === 4) {

          (function(self, value) {
            setTimeout(function() {
              self.lockScreen.checkPassCode(value);
            }, CODE_VISIBLE_TIMEOUT);
          })(this, this.states.passCodeEntered);
        }
        break;
    }
  };

  exports.LockScreenInputpad = LockScreenInputpad;
})(window);
