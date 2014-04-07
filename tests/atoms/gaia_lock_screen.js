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
    let obj = {'screen.timeout': 0, 'lockscreen.enabled': true};

    setlock.set(obj);

    // Need to trigger the event to let the LWM to open the LockScreen window
    // and instantiate the instance.
    window.wrappedJSObject.ScreenManager.turnScreenOff(true, 'powerkey');
    window.wrappedJSObject.ScreenManager.turnScreenOn(true);
    waitFor(function() {
      finish(!lockscreen.locked);
    }, function() {
      return lwm.states.instance.isActive();
    });
  }
};
