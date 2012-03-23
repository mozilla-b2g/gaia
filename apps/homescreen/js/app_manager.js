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

/*
    // The current language for localizing the manifest
    var lang = document.mozL10n.language.code;


        if (!app.manifest) {
          console.warn('malformed manifest for ' + app.origin);
          return;
        }

        var origin = app.origin;
        var manifest = app.manifest;
        var name = manifest.name;

        // localize the manifest
        if (manifest.locales && manifest.locales[lang]) {
          var loc = manifest.locales[lang];
          for (var k in loc)
            manifest[k] = loc[k];
        }


        // FIXME: need to be smarter about using whatever icon size
        // is the best.  And actually, that logic ought to in the homescreen
        // UI, not here.  Maybe just store the entire manifest and let
        // the homescreen choose it own icons
        var icon = manifest.icons ? app.origin + manifest.icons['120'] : '';

        var orientation = "";
        // We only allow those values for orientation in manifest.
        if (manifest.orientation == "portrait-primary" ||
            manifest.orientation == "portrait-secondary" ||
            manifest.orientation == "landscape-primary" ||
            manifest.orientation == "landscape-secondary") {
          orientation = manifest.orientation;
        }

        var url = app.origin + manifest.launch_path;

        installedApps.push({
          name: manifest.name,
          app: app,
          url: url,
          icon: icon,
          fullscreen: manifest.fullscreen || false,
          orientation: orientation,
          hackKillMe: manifest.hackKillMe || false
        });
      });
*/

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