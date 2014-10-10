/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';
/* globals waitFor, finish */
/* exported GaiaLockScreen */

var GaiaLockScreen = {

  unlock: function(forcibly) {
    let setlock = window.wrappedJSObject.SettingsListener.getSettingsLock();
    let service = window.wrappedJSObject.Service;
    let obj = {'screen.timeout': 0};
    setlock.set(obj);

    waitFor(
      function() {
        service.request('unlock', { forcibly: forcibly });
        waitFor(
          function() {
            finish(service.locked);
          },
          function() {
            return !service.locked;
          }
        );
      },
      function() {
        return !!service;
      }
    );
  },

  lock: function(forcibly) {
    let service = window.wrappedJSObject.Service;
    let setlock = window.wrappedJSObject.SettingsListener.getSettingsLock();
    let obj = {'screen.timeout': 0};
    setlock.set(obj);
    waitFor(
      function() {
      service.request('lock', { forcibly: forcibly });
        waitFor(
          function() {
            finish(!service.locked);
          },
          function() {
            return service.locked;
          }
        );
      },
      function() {
        return !!service;
      }
    );
  }
};
