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

/* globals IACHandler */

/**
 * Forward all relevant events in System to the LockScreen frame.
 * System --> LockScreen
 */
'use strict';
(function(exports) {
  var LockScreenAgent = function(frame) {
    this.configs = {
      listens: [
        'lockscreen-notification-request-append',
        'lockscreen-notification-request-clear',
        'emergency-call-leave',
        'screenchange',
        'timeformatchange',
        'iac-mediacomms',
        'appterminated',  // for the music playback widget
        'bluetoothprofileconnectionchange',
        'lockscreen-request-mediacommand',
        'lockscreen-appclosed'  // necessary for state manager
      ]
    };
    this.frame = frame;
  };

  LockScreenAgent.prototype.start = function() {
    this.startEventListeners();
  };

  LockScreenAgent.prototype.startEventListeners = function() {
    this.configs.listens.forEach((ename) => {
      window.addEventListener(ename, this);
    });
  };

  LockScreenAgent.prototype.handleEvent = function(event) {
    // XXX: This is a special case: it do not forward System events to
    // LockScreen frame. Instead of, the event flow is:
    //
    // LockScreen -> System -> (this agent) -> IAC
    //
    // This is because WHEN we're in the inner iframe, comapre to the real
    // app frame, LockScreen can't get the IAC port to communicate with
    // media apps. So we need an agent to forward it.
    //
    // @see LockScreenMediaPlaybackWidget#handleEvent
    if ('lockscreen-request-mediacommand' === event.type) {
      var port = IACHandler.getPort('mediacomms');
      if (!port) {
        console.error('No port for MediaPlaybackWidget');
        return;
      }
      port.postMessage( { command: event.detail } );
      return;
    }

    // XXX: Before we make LockScreen really as an iframe,
    // do nothing and let events pass through.
    // After we put LockScreen in an iframe, re-create the event and
    // dispatch it to LockScreen's window.
  };

  LockScreenAgent.prototype.stop = function() {
    this.configs.listens.forEach((ename) => {
      window.removeEventListener(ename, this);
    });
  };
  exports.LockScreenAgent = LockScreenAgent;
})(window);

