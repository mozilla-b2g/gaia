/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

var GaiaLockScreen = {

  unlock: function() {

    let setlock = window.wrappedJSObject.SettingsListener.getSettingsLock();
    let obj = {'screen.timeout': 0};
    setlock.set(obj);

    window.wrappedJSObject.ScreenManager.turnScreenOn();

    waitFor(
      function() {
        window.wrappedJSObject.lockScreen.unlock(true);
        waitFor(
          function() {
            finish(window.wrappedJSObject.lockScreen.locked);
          },
          function() {
            return !window.wrappedJSObject.lockScreen.locked;
          }
        );
      },
      function() {
        return !!window.wrappedJSObject.lockScreen;
      }
    );
  },

  lock: function() {

    let setlock = window.wrappedJSObject.SettingsListener.getSettingsLock();
    let obj = {'screen.timeout': 0};
    setlock.set(obj);

    window.wrappedJSObject.ScreenManager.turnScreenOn();

    waitFor(
      function() {
        window.wrappedJSObject.lockScreen.lock(true);
        waitFor(
          function() {
            finish(!window.wrappedJSObject.lockScreen.locked);
          },
          function() {
            return window.wrappedJSObject.lockScreen.locked;
          }
        );
      },
      function() {
        return !!window.wrappedJSObject.lockScreen;
      }
    );
  }
};
