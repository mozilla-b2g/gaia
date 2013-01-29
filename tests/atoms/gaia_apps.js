/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

var GaiaApps = {

  normalizeName: function(name) {
    return name.replace(/[- ]+/g, '').toLowerCase();
  },

  getRunningApps: function() {
    let runningApps = window.wrappedJSObject.WindowManager.getRunningApps();
    // Return a simplified version of the runningApps object which can be
    // JSON-serialized.
    let apps = {};
    for (let app in runningApps) {
        let anApp = {};
        for (let key in runningApps[app]) {
            if (['name', 'origin', 'manifest'].indexOf(key) > -1) {
                anApp[key] = runningApps[app][key];
            }
        }
        apps[app] = anApp;
    }
    return apps;
  },

  getRunningAppOrigin: function(name) {
    let runningApps = window.wrappedJSObject.WindowManager.getRunningApps();
    let origin;

    for (let property in runningApps) {
      if (runningApps[property].name == name) {
        origin = property;
      }
    }

    return origin;
  },

  getPermission: function(appName, permissionName) {
    GaiaApps.locateWithName(appName, function(app) {
      console.log("Getting permission '" + permissionName + "' for " + appName);
      var mozPerms = navigator.mozPermissionSettings;
      var result = mozPerms.get(
        permissionName, app.manifestURL, app.origin, false
      );
      marionetteScriptFinished(result);
    });
  },

  setPermission: function(appName, permissionName, value) {
    GaiaApps.locateWithName(appName, function(app) {
      console.log("Setting permission '" + permissionName + "' for " +
        appName + "to '" + value + "'");
      var mozPerms = navigator.mozPermissionSettings;
      mozPerms.set(
        permissionName, value, app.manifestURL, app.origin, false
      );
      marionetteScriptFinished();
    });
  },

  sendLocateResponse: function (aCallback, app, appName, entryPoint) {
    if (aCallback) {
      aCallback(app, appName, entryPoint);
      return;
    }

    var result = false;
    if (typeof(app) === 'object') {
      result = {
        name: app.manifest.name,
        origin: app.origin,
        entryPoint: entryPoint || null,
        normalizedName: appName
      };
    }

    marionetteScriptFinished(result);
  },

  locateWithName: function(name, aCallback) {
    let appsReq = navigator.mozApps.mgmt.getAll();
    appsReq.onsuccess = function() {
      let apps = appsReq.result;
      let normalizedSearchName = GaiaApps.normalizeName(name);

      for (let i = 0; i < apps.length; i++) {
        let app = apps[i];
        let origin = null;
        let entryPoints = app.manifest.entry_points;
        if (entryPoints) {
          for (let ep in entryPoints) {
            let currentEntryPoint = entryPoints[ep];
            let appName = currentEntryPoint.name;

            if (normalizedSearchName === GaiaApps.normalizeName(appName)) {
              return GaiaApps.sendLocateResponse(aCallback, app, appName, ep);
            }
          }
        } else {
          let appName = app.manifest.name;

          if (normalizedSearchName === GaiaApps.normalizeName(appName)) {
            return GaiaApps.sendLocateResponse(aCallback, app, appName);
          }
        }
      }

      GaiaApps.sendLocateResponse(aCallback, false);
    };
  },

  locateWithManifestURL: function(manifestURL, entryPoint, aCallback) {

    var app = window.wrappedJSObject.Applications.getByManifestURL(manifestURL);
    var appName;

    if (entryPoint) {
      if (app.manifest.entry_points[entryPoint]) {
        appName = app.manifest.entry_points[entryPoint].name;
      } else {
        app = null;
      }
    } else {
      appName = app.manifest.name;
    }

    GaiaApps.sendLocateResponse(aCallback, app, appName, entryPoint);
  },

  // Returns the number of running apps.
  numRunningApps: function() {
    let count = 0;
    let runningApps = window.wrappedJSObject.WindowManager.getRunningApps();
    for (let origin in runningApps) {
      count++;
    }
    return count;
  },

  // Kills the specified app.
  kill: function(aOrigin, aCallback) {
    var callback = aCallback || marionetteScriptFinished;
    let runningApps = window.wrappedJSObject.WindowManager.getRunningApps();
    if (!runningApps.hasOwnProperty(aOrigin)) {
      callback(false);
    }
    else {
      window.addEventListener('appterminated', function gt_onAppTerminated() {
        window.removeEventListener('appterminated', gt_onAppTerminated);
        waitFor(
          function() {
            console.log("app with origin '" + aOrigin + "' has terminated");
            callback(true);
          },
          function() {
            let runningApps =
              window.wrappedJSObject.WindowManager.getRunningApps();
            return !runningApps.hasOwnProperty(aOrigin);
          }
        );
      });
      console.log("terminating app with origin '" + aOrigin + "'");
      window.wrappedJSObject.WindowManager.kill(aOrigin);
    }
  },

  // Kills all running apps, except the homescreen.
  killAll: function() {
    let originsToClose = [];
    let that = this;

    let runningApps = window.wrappedJSObject.WindowManager.getRunningApps();
    for (let origin in runningApps) {
      if (origin.indexOf('homescreen') == -1) {
        originsToClose.push(origin);
      }
    }

    if (!originsToClose.length) {
      marionetteScriptFinished(true);
      return;
    }

    originsToClose.slice(0).forEach(function(origin) {
      GaiaApps.kill(origin, function() {});
    });

    // Even after the 'appterminated' event has been fired for an app,
    // it can still exist in the apps list, so wait until 1 or fewer
    // apps are running (since we don't close the homescreen app).
    waitFor(
      function() { marionetteScriptFinished(true); },
      function() { return that.numRunningApps() <= 1; }
    );
  },

  launch: function(app, appName, entryPoint) {
    if (!app) {
      marionetteScriptFinished(false);
      return;
    }

    let origin = GaiaApps.getRunningAppOrigin();
    let alreadyRunning = !!origin;

    app.launch(entryPoint || null);

    waitFor(
      function() {
        let runningApps = window.wrappedJSObject.WindowManager.getRunningApps();
        let app = runningApps[origin];
        let result = {frame: app.iframe,
                      src: app.iframe.src,
                      name: app.name,
                      origin: origin};

        if (alreadyRunning) {
          // return the app's frame
          marionetteScriptFinished(result);
        }
        else {
          // wait until the new iframe sends the apploadtime event
          window.addEventListener('apploadtime', function launched() {
            window.removeEventListener('apploadtime', launched);
            marionetteScriptFinished(result);
          });
        }
      },
      // wait until the app is found in the running apps list
      function() {
        origin = GaiaApps.getRunningAppOrigin(appName);
        return !!origin;
      }
    );
  },

  // Launches app with the specified name (e.g., 'Calculator'); returns the
  // an object with the app frame if successful, false if the app can't be
  // found, or times out if the app frame can't be found after launching the app.
  launchWithName: function(name) {
    GaiaApps.locateWithName(name, this.launch);
  },

  // Launches app with the specified manifestURL. returns the
  // an object with the app frame if successful, false if the app can't be
  // found, or times out if the app frame can't be found after launching the app.
  //
  // This is prefered over launchWithName because localized builds have
  // different names
  launchWithManifestURL: function(manifestURL, entryPoint) {
    GaiaApps.locateWithManifestURL(manifestURL, entryPoint, this.launch);
  },

  close: function(app, appName, entryPoint) {
    if (!app) {
      marionetteScriptFinished(false);
      return;
    }

    let origin = GaiaApps.getRunningAppOrigin(appName);

    waitFor(
      function() {
        window.wrappedJSObject.WindowManager.kill(origin, marionetteScriptFinished);
      },
      // wait until the app is found in the running apps list
      function() {
        origin = GaiaApps.getRunningAppOrigin(appName);
        return !!origin;
      }
    );
  },

  // Closes app with the specified name (e.g., 'Calculator'); returns nothing
  closeWithName: function(name) {
    GaiaApps.locateWithName(name, this.close);
  },

  closeWithManifestURL: function(manifestURL, entryPoint) {
    GaiaApps.locateWithManifestURL(manifestURL, entryPoint, this.close);
  },

  /**
   * Uninstalls the app with the specified name.
   */
  uninstallWithName: function(name) {
    GaiaApps.locateWithName(name, function uninstall(app) {
      navigator.mozApps.mgmt.uninstall(app);
      marionetteScriptFinished(false);
    });
  }

};
