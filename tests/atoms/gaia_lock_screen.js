/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

var GaiaLockScreen = {

  unlock: function() {
    let setlock = window.wrappedJSObject.SettingsListener.getSettingsLock();
    let obj = {'screen.timeout': 0};
    setlock.set(obj);
    waitFor(function() {
      window.wrappedJSObject.dispatchEvent(
        new window.wrappedJSObject.CustomEvent('request-unlock'));
      waitFor(function() {
        finish(true);
      }, function() {
        return !window.wrappedJSObject.System.locked;
      });
    }, function() {
      return window.wrappedJSObject.System;
    });
  },

  lock: function() {
    let setlock = window.wrappedJSObject.SettingsListener.getSettingsLock();
    let obj = {'screen.timeout': 0};
    setlock.set(obj);
    waitFor(function() {
      window.wrappedJSObject.dispatchEvent(
        new window.wrappedJSObject.CustomEvent('request-lock'));
      waitFor(function() {
        finish(true);
      }, function() {
        return window.wrappedJSObject.System.locked;
      });
    }, function() {
      return window.wrappedJSObject.System;
    });
  }
};
