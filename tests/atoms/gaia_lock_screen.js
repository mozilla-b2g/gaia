/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

var GaiaLockScreen = {

  unlock: function() {
    let lockscreen = window.wrappedJSObject.lockScreen || window.wrappedJSObject.LockScreen;
    let setlock = window.wrappedJSObject.SettingsListener.getSettingsLock();
    let obj = {'screen.timeout': 0};
    setlock.set(obj);

    window.wrappedJSObject.ScreenManager.turnScreenOn();

    waitFor(
      function() {
        lockscreen.unlock();
        waitFor(
          function() {
            finish(lockscreen.locked);
          },
          function() {
            return !lockscreen.locked;
          }
        );
      },
      function() {
        return !!lockscreen;
      }
    );
  },

  lock: function() {
    let lwm = window.wrappedJSObject.lockScreenWindowManager;
    let lockscreen = window.wrappedJSObject.lockScreen || window.wrappedJSObject.LockScreen;
    let setlock = window.wrappedJSObject.SettingsListener.getSettingsLock();
    let obj = {'screen.timeout': 0};
    let waitLock = function() {
      waitFor(
        function() {
          lockscreen.lock(true);
          waitFor(
            function() {
              finish(!lockscreen.locked);
            },
            function() {
              return lockscreen.locked;
            }
          );
        },
        function() {
          return !!lockscreen;
        }
      );
    };

    setlock.set(obj);
    window.wrappedJSObject.ScreenManager.turnScreenOn();

    // Need to open the window before we lock the lockscreen.
    // This would only happen when someone directly call the lockscrene.lock.
    // It's a bad pattern and would only for test.
    lwm.openApp();
    waitFor(function() {
      waitLock();
    }, function() {
      return lwm.states.instance.isActive();
    });
  }
};
