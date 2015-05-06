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
  window.addEventListener('lockscreen-frame-bootstrap', function startup(evt) {
    var parent = evt.detail || window;
    // XXX: Because we don't have real app bootstraping yet.
    parent.lockScreenFrameAgent = new LockScreenFrameAgent(window.parent);
    parent.lockScreenFrameAgent.start();
    this.lockScreen = new LockScreen();
    parent.lockScreen = this.lockScreen;
    parent.lockScreenStateManager = new window.LockScreenStateManager();
    parent.lockScreenStateManager.start(this.lockScreen);
    this.lockScreen.init();
    parent.lockScreenNotifications = new LockScreenNotifications();
    parent.lockScreenNotifications.start(this.lockScreen,
      parent.lockScreen.notificationsContainer);
  });
})();
