'use strict';

// TODO:
// This separation of AppManager from the homescreen code that is the
// visual representation of the apps is unnatural.  This code ought to
// be part of homescreen.js, and much of the code in homescreen.js ought
// to be spun off into separate files like lockscreen.js and sleepmenu.js
var AppManager = (function() {

  var installedApps = null;

  function getInstalledApps(callback) {
    if (installedApps) {
      callback(installedApps);
      return;
    }

    installedApps = {};

    navigator.mozApps.mgmt.getAll().onsuccess = function(e) {
      var apps = e.target.result;
      apps.forEach(function(app) {
        installedApps[app.origin] = app;
      });
      callback(installedApps);
    };
  }

  function getAppByOrigin(origin) {
    return installedApps[origin];
  }

  return {
    getInstalledApps: getInstalledApps,
    getAppByOrigin: getAppByOrigin
  };
}());

// TODO
// Gaia.AppManager.foregroundWindow is currently used by the keyboard
// There isn't any reason for any other code to use it, and we should
// get rid of it when we can.
// See bug 736628: https://bugzilla.mozilla.org/show_bug.cgi?id=736628
if (!window['Gaia'])
  var Gaia = {};

Gaia.AppManager = {
  get foregroundWindow() {
    return WindowManager.getAppFrame(WindowManager.getDisplayedApp());
  }
};