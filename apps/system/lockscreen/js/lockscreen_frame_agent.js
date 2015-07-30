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
 * XXX: The name here is a temporary name. If we're in a LockScreen app,
 * it should be 'SystemAgent' as a counterpart of 'LockScreenAgent'
 * in System app. However, to put a 'SystemAgent' in System app
 * would confuse people.
 *
 * Forward all public events inside the LockScreen frame to System.
 * LockScreen --> System
 */
'use strict';
(function(exports) {
  var LockScreenFrameAgent = function(targetWindow) {
    this.configs = {
      listens: [
        'unlocking-start',
        'unlocking-stop',
        'secure-killapps',
        'secure-closeapps',
        'secure-launchapp',
        'secure-modeoff',
        'secure-modeon',
        'lockpanelchange',
        'lockscreen-request-unlock',
        'lockscreen-request-mediacommand'
      ]
    };
    this.targetWindow = targetWindow;
  };
  LockScreenFrameAgent.prototype.start = function() {
    this.configs.listens.forEach((ename) => {
      window.addEventListener(ename, this);
    });
  };

  LockScreenFrameAgent.prototype.handleEvent = function(event) {
    // XXX: Before we make LockScreen really as an iframe,
    // do nothing and let events pass through.
    // After we put LockScreen in an iframe, re-create the event and
    // dispatch it to System's window.
  };

  LockScreenFrameAgent.prototype.stop = function() {
    this.configs.listens.forEach((ename) => {
      window.removeEventListener(ename, this);
    });
  };
  exports.LockScreenFrameAgent = LockScreenFrameAgent;
})(window);
