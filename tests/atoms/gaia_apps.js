/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

var GaiaApps = {

  normalizeName: function(name) {
    return name.replace(/[- ]+/g, '').toLowerCase();
  },

  getInstalledApps: function() {
    let req = navigator.mozApps.mgmt.getAll();
    req.onsuccess = function() {
      marionetteScriptFinished(req.result);
    }
  },

  getRunningApps: function() {
    let manager = window.wrappedJSObject.AppWindowManager || window.wrappedJSObject.WindowManager;
    let runningApps = ('getApps' in manager) ? manager.getApps() : manager.getRunningApps();
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
        apps[app.origin] = anApp;
    }
    return apps;
  },

  getApps: function() {
    let manager = window.wrappedJSObject.AppWindowManager || window.wrappedJSObject.WindowManager;
    let apps = ('getApps' in manager) ? manager.getApps() : manager.getRunningApps();
    return apps;
  },

  getRunningAppOrigin: function(name) {
    let apps = GaiaApps.getApps();

    for (let id in apps) {
      if (apps[id].name == name) {
        return apps[id].origin;
      }
    }

    return undefined;
  },

  getAppByName: function(name) {
    let apps = GaiaApps.getApps();

    for (let id in apps) {
      if (apps[id].name == name) {
        return apps[id];
      }
    }
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

  sendLocateResponse: function(aCallback, app, appName, entryPoint) {
    var callback = aCallback || marionetteScriptFinished;
    if (callback === marionetteScriptFinished) {
      var result = false;
      if (typeof(app) === 'object') {
        result = {
          name: app.manifest.name,
          origin: app.origin,
          entryPoint: entryPoint || null,
          normalizedName: appName
        };
      }
      callback(result);
    } else {
      callback(app, appName, entryPoint);
    }
  },

  locateWithName: function(name, aCallback) {
    var callback = aCallback || marionetteScriptFinished;
    let apps = window.wrappedJSObject.Applications.installedApps;
    let normalizedSearchName = GaiaApps.normalizeName(name);

    for (let manifestURL in apps) {
      let app = apps[manifestURL];
      let origin = null;
      let entryPoints = app.manifest.entry_points;
      if (entryPoints) {
        for (let ep in entryPoints) {
          let currentEntryPoint = entryPoints[ep];
          let appName = currentEntryPoint.name;

          if (normalizedSearchName === GaiaApps.normalizeName(appName)) {
            return GaiaApps.sendLocateResponse(callback, app, appName, ep);
          }
        }
      } else {
        let appName = app.manifest.name;

        if (normalizedSearchName === GaiaApps.normalizeName(appName)) {
          return GaiaApps.sendLocateResponse(callback, app, appName);
        }
      }
    }
    callback(false);
  },

  locateWithManifestURL: function(manifestURL, entryPoint, aCallback) {
    var callback = aCallback || marionetteScriptFinished;
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

    GaiaApps.sendLocateResponse(callback, app, appName, entryPoint);
  },

  // Returns the number of running apps.
  numRunningApps: function() {
    let count = 0;
    let apps = GaiaApps.getApps();
    for (let id in apps) {
      count++;
    }
    return count;
  },

  isRunning: function(origin) {
    var apps = GaiaApps.getApps();
    for (var id in apps) {
      if (apps[id].origin === origin) {
        return true;
      }
    }
    return false;
  },

  // Kills the specified app.
  kill: function(aOrigin, aCallback) {
    var callback = aCallback || marionetteScriptFinished;
    if (!GaiaApps.isRunning(aOrigin)) {
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
            return !GaiaApps.isRunning(aOrigin);
          }
        );
      });
      console.log("terminating app with origin '" + aOrigin + "'");
      let manager = window.wrappedJSObject.AppWindowManager || window.wrappedJSObject.WindowManager;
      manager.kill(aOrigin);
    }
  },

  // Kills all running apps, except the homescreen.
  killAll: function() {
    let originsToClose = [];
    let that = this;

    let apps = GaiaApps.getApps();
    for (let id in apps) {
      let origin = apps[id].origin;
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
    if (app) {
      let origin = app.origin;

      let sendResponse = function() {
        let appWindow = GaiaApps.getAppByName(appName);
        let origin = appWindow.origin;
        let result = {
          frame: (appWindow.browser) ? appWindow.browser.element : appWindow.frame.firstChild,
          src: (appWindow.browser) ? appWindow.browser.element.src : appWindow.iframe.src,
          name: appWindow.name,
          origin: origin};
        marionetteScriptFinished(result);
      };

      if (GaiaApps.getActiveApp().origin == origin) {
        console.log("app with origin '" + origin + "' is already running");
        sendResponse();
      } else {
        window.addEventListener('appopen', function appOpen() {
          window.removeEventListener('appopen', appOpen);
          waitFor(
            function() {
              console.log("app with origin '" + origin + "' has launched");
              sendResponse();
            },
            function() {
              let origin = GaiaApps.getRunningAppOrigin(appName);
              return GaiaApps.getActiveApp().origin == origin;
            }
          );
        });
        console.log("launching app with name '" + appName + "'");
        app.launch(entryPoint || null);
      }
    } else {
      marionetteScriptFinished(false);
    }
  },

  // Launches app with the specified name (e.g., 'Calculator'); returns the
  // an object with the app frame if successful, false if the app can't be
  // found, or times out if the app frame can't be found after launching the
  // app.
  launchWithName: function(name) {
    GaiaApps.locateWithName(name, this.launch.bind(this));
  },

  // Launches app with the specified manifestURL. returns the
  // an object with the app frame if successful, false if the app can't be
  // found, or times out if the app frame can't be found after launching the
  // app.
  //
  // This is prefered over launchWithName because localized builds have
  // different names
  launchWithManifestURL: function(manifestURL, entryPoint) {
    GaiaApps.locateWithManifestURL(manifestURL, entryPoint, this.launch);
  },

  close: function(app, appName, entryPoint) {
    if (app) {
      let origin = GaiaApps.getRunningAppOrigin(appName);
      GaiaApps.kill(origin);
    } else {
      marionetteScriptFinished(false);
    }
  },

  // Closes app with the specified name (e.g., 'Calculator'); returns nothing
  closeWithName: function(name) {
    GaiaApps.locateWithName(name, this.close);
  },

  closeWithManifestURL: function(manifestURL, entryPoint) {
    GaiaApps.locateWithManifestURL(manifestURL, entryPoint, this.close);
  },

  getActiveApp: function() {
    let manager = window.wrappedJSObject.AppWindowManager || window.wrappedJSObject.WindowManager;
    let app = ('getActiveApp' in manager) ? manager.getActiveApp() : manager.getCurrentDisplayedApp();
    return app;
  },

  /**
   * Returns the currently displayed app.
   */
  displayedApp: function() {
    let manager = window.wrappedJSObject.AppWindowManager || window.wrappedJSObject.WindowManager;
    let app = ('getActiveApp' in manager) ? manager.getActiveApp() : manager.getCurrentDisplayedApp();
    let origin = app.origin;
    console.log("app with origin '" + origin + "' is displayed");
    let result = {
      frame: (app.browser) ? app.browser.element : app.frame.firstChild,
      src: (app.browser) ? app.browser.element.src : app.iframe.src,
      name: app.name,
      origin: origin
    };
    marionetteScriptFinished(result);
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
