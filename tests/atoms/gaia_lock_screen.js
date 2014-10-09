/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';
/* globals waitFor, finish */
/* exported GaiaLockScreen */

var GaiaLockScreen = {

  unlock: function(forcibly) {
    let setlock = window.wrappedJSObject.SettingsListener.getSettingsLock();
    let system = window.wrappedJSObject.System;
    let obj = {'screen.timeout': 0};
    setlock.set(obj);

    waitFor(
      function() {
        system.request('unlock', { forcibly: forcibly });
        waitFor(
          function() {
            finish(system.locked);
          },
          function() {
            return !system.locked;
          }
        );
      },
      function() {
        return !!system;
      }
    );
  },

  lock: function(forcibly) {
    let system = window.wrappedJSObject.System;
    let setlock = window.wrappedJSObject.SettingsListener.getSettingsLock();
    let obj = {'screen.timeout': 0};
    setlock.set(obj);
    waitFor(
      function() {
      system.request('lock', { forcibly: forcibly });
        waitFor(
          function() {
            finish(!system.locked);
          },
          function() {
            return system.locked;
          }
        );
      },
      function() {
        return !!system;
      }
    );
  }
};
