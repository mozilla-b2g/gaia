/*
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
/* global LockScreenInputpad */
'use strict';

/**
 * XXX: Bootstrap LockScreen. Note this is NOT flexible, so we need to
 * rewrite it with some dependency managing bootstraping component.
 **/
(function(exports) {
  window.addEventListener('lockscreen-inputpad-frame-bootstrap',
  function startup() {
    // XXX: We assume LockScreenWindow is before us and it registered
    // the 'lockscreen' in 'window' This should be eliminated once
    // we moved LockScreen as an iframe and killed LockScreen dependencies.
    window.lockScreenInputpad = (new LockScreenInputpad(window.lockScreen))
      .start();
  });
})(window);

