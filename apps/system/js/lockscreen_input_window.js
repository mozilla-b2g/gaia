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

/* global AppWindow */
'use strict';

/**
 * This prototype is for the keypad of LockScreen passcode.
 **/
(function(exports) {
  var LockScreenInputWindow = function() {
    // XXX: Before we make this window using real keyboard app iframe,
    // we need to mock these (see Bug 1053680).
    var configs = {
      url: window.location.href,
      manifest: {
        orientation: ['default']
      },
      name: 'LockscreenInputPad',
      // No manifestURL + no chrome would cause a default chrome app
      manifestURL: window.location.href.replace('system',
                  'lockscreen-inputapp') +
                  '/manifest.webapp',
      origin: window.location.origin.replace('system', 'lockscreen')
    };
    this.iframe = this.createFrame();
    AppWindow.call(this, configs);
    this.element.setAttribute('aria-hidden', true);
    window.dispatchEvent(
      new CustomEvent('lockscreen-inputpad-frame-bootstrap'));
  };
  LockScreenInputWindow.prototype = Object.create(AppWindow.prototype);
  LockScreenInputWindow.prototype._DEBUG = false;
  LockScreenInputWindow.prototype.eventPrefix = 'lockscreen-inputapp';
  LockScreenInputWindow.prototype.openAnimation = 'slide-from-bottom';
  LockScreenInputWindow.prototype.closeAnimation = 'slide-to-bottom';
  LockScreenInputWindow.prototype.CLASS_LIST =
    'appWindow lockScreenInputWindow';
  LockScreenInputWindow.prototype.CLASS_NAME = 'LockScreenInputWindow';
  LockScreenInputWindow.prototype.createFrame =
    function() {
      // XXX: Before we can use real keyboard iframe, we need these.
      var frame = document.getElementById('lockscreen-inputpad-frame');
      frame.setVisible = function() {};
      frame.addNextPaintListener = function(cb) {
        cb();
      };
      frame.removeNextPaintListener = function() {};
      frame.getScreenshot = function() {
        // Mock the request.
        return {
          get onsuccess() {return null;},
          set onsuccess(cb) {
            var mockEvent = {
              target: {result: null}
            };
            cb(mockEvent);
          }
        };
      };
      frame.removeAttribute('hidden');
      return frame;
    };
  exports.LockScreenInputWindow = LockScreenInputWindow;
})(window);

