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

/**
 * This component would do validation and observe the passcode
 * change from Settings. The user should send an
 * 'lockscreen-request-passcode-validate' event with a request object
 * as its detail, which contains 'onsuccess', 'onerror' and 'passcode'
 * fields. After validate the 'passcode', this component would
 * call 'onsuccess' or 'onerror' according to the result.
 */

'use strict';
(function(exports) {

  /**
   * @class LockScreenPasscodeValidator
   */
  var LockScreenPasscodeValidator = function() {};

  /**
   * Start the class according to the System convention.
   * @moduleOf {LockScreenPasscodeValidator}
   */
  LockScreenPasscodeValidator.prototype.start =
  function lspv_start() {
    this.states = {
      passcode: '0000' // will read from settings
    };

    this.configs = {
      listens: [
        'lockscreen-request-passcode-validate'
      ]
    };

    // Since observers need to be a bound callback
    // to be register/unregister, we need to keep the
    // bound version here. See the 'observeSettings'
    // function.
    this.observers = {};

    this.configs.listens.forEach((ename) => {
      window.addEventListener(ename, this);
    });

    this.observeSettings();
  };

  /**
   * Start to observe changes of the passcode and others.
   * @moduleOf {LockScreenPasscodeValidator}
   */
  LockScreenPasscodeValidator.prototype.observeSettings =
  function lspv_observeSettings() {
    // If we don't do this, the bound version can't be saved,
    // and then we can't unobserve it.
    this.observers.passcodeChanged =
      this.onPasscodeChanged.bind(this);
    window.SettingsListener.observe(
      'lockscreen.passcode-lock.code', '0000',
      this.observers.passcodeChanged);
  };

  /**
   * Handle the event.
   * @param evt {Event}
   * @moduleOf {LockScreenPasscodeValidator}
   */
  LockScreenPasscodeValidator.prototype.handleEvent =
  function lspv_handleEvent(evt) {
    switch(evt.type) {
      case 'lockscreen-request-passcode-validate':
        this.onValidateRequest(evt.detail);
        break;
    }
  };

  /**
   * Handle the event. The request should has 'onsuccess', 'onerror' and
   * 'passcode' fields. This component would validate the 'passcode' and then
   * call 'onsuccess' or 'onerror' according to the result.
   *
   * @param request {Object} - the request object
   * @moduleOf {LockScreenPasscodeValidator}
   */
  LockScreenPasscodeValidator.prototype.onValidateRequest =
  function lspv_onValidateRequest(request) {
    if (this.states.passcode !== request.passcode) {
      request.onerror();
    } else {
      request.onsuccess();
    }
  };

  /**
   * When passcode changed by user, change the state.
   *
   * @param value {string}
   * @moduleOf {LockScreenPasscodeValidator}
   */
  LockScreenPasscodeValidator.prototype.onPasscodeChanged =
  function lspv_onPasscodeChanged(value) {
    this.states.passcode = value;
  };

  /**
   * Stop to observe changes of the passcode and others.
   * @moduleOf {LockScreenPasscodeValidator}
   */
  LockScreenPasscodeValidator.prototype.unobserveSettings =
  function lspv_observeSettings() {
    this.observers.passcodeChanged =
    window.SettingsListener.unobserve(
      'lockscreen.passcode-lock.code',
      this.observers.passcodeChanged);
  };

  /**
   * Stop this instance.
   * @moduleOf {LockScreenPasscodeValidator}
   */
  LockScreenPasscodeValidator.prototype.stop =
  function lspv_stop() {
    this.configs.listens.forEach((ename) => {
      window.removeEventListener(ename, this);
    });
    this.unobserveSettings();
  };

  exports.LockScreenPasscodeValidator = LockScreenPasscodeValidator;
})(window);
