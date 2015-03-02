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
/* global LockScreen, LockScreenNotifications, LockScreenFrameAgent */
'use strict';
(function() {
  window.addEventListener('lockscreen-frame-bootstrap', function startup() {
    // XXX: Because we don't have real app bootstraping yet.
    window.lockScreenFrameAgent = new LockScreenFrameAgent(window.parent);
    window.lockScreenFrameAgent.start();
    this.lockscreen = new LockScreen();
    window.lockScreen = this.lockscreen;
    window.lockScreenStateManager = new window.LockScreenStateManager();
    window.lockScreenStateManager.start(window.lockScreen);
    this.lockscreen.init();
    window.lockScreenNotifications = new LockScreenNotifications();
    window.lockScreenNotifications.start(this.lockscreen,
      this.lockscreen.notificationsContainer);
  });
})();
