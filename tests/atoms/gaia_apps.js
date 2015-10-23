/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';
/* globals marionetteScriptFinished, waitFor */

var GaiaApps = {

  normalizeName: function(name) {
    return name.replace(/[- ]+/g, '').toLowerCase();
  },

  getInstalledApps: function() {
    let req = navigator.mozApps.mgmt.getAll();
    req.onsuccess = function() {
      marionetteScriptFinished(req.result);
    };
  },

  getRunningApps: function(includeSystemApps) {
    let runningApps = GaiaApps.getApps(includeSystemApps);
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
        apps[runningApps[app].origin] = anApp;
    }
    return apps;
  },

  getApps: function(includeSystemApps) {
    let service = window.wrappedJSObject.Service;
    let apps = includeSystemApps ?
                service.query('getApps') :
                service.query('snapshot');
    return apps;
  },

  getRunningAppOrigin: function(name) {
    let apps = GaiaApps.getApps(true);

    for (let id in apps) {
      if (apps[id].name == name) {
        return apps[id].origin;
      }
    }

    return undefined;
  },

  getPermission: function(appName, permissionName) {
    GaiaApps.locateWithName(appName, function(app) {
      console.log('Getting permission \'' +
        permissionName +
        '\' for ' +
        appName);
      var mozPerms = navigator.mozPermissionSettings;
      var result = mozPerms.get(
        permissionName, app.manifestURL, app.origin, false
      );
      marionetteScriptFinished(result);
    });
  },

  setPermission: function(appName, permissionName, value) {
    GaiaApps.locateWithName(appName, function(app) {
      console.log('Setting permission \'' + permissionName + '\' for ' +
        appName + 'to \'' + value + '\'');
      var mozPerms = navigator.mozPermissionSettings;
      mozPerms.set(
        permissionName, value, app.manifestURL, app.origin, false
      );
      marionetteScriptFinished();
    });
  },

  setPermissionByUrl: function(manifestUrl, permissionName, value, entryPoint) {
    GaiaApps.locateWithManifestURL(manifestUrl, entryPoint, function(app) {
      console.log('Setting permission \'' + permissionName + '\' for ' +
        manifestUrl + 'to \'' + value + '\'');
      var mozPerms = navigator.mozPermissionSettings;
      mozPerms.set(
        permissionName, value, app.manifestURL, app.origin, false
      );
      marionetteScriptFinished();
    });
  },

  sendLocateResponse:
  function(aCallback, app, appName, launchPath, entryPoint) {
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
      callback(app, appName, launchPath, entryPoint);
    }
  },

  locateWithName: function(name, aCallback) {
    var callback = aCallback || marionetteScriptFinished;
    let apps = window.wrappedJSObject.applications ||
                window.wrappedJSObject.Applications;
    let installedApps = apps.installedApps;
    let normalizedSearchName = GaiaApps.normalizeName(name);

    for (let manifestURL in installedApps) {
      let app = installedApps[manifestURL];
      let entryPoints = app.manifest.entry_points;
      if (entryPoints) {
        for (let ep in entryPoints) {
          let currentEntryPoint = entryPoints[ep];
          let appName = currentEntryPoint.name;
          let launchPath = currentEntryPoint.launch_path;
          let locales = currentEntryPoint.locales;

          if (normalizedSearchName === GaiaApps.normalizeName(appName)) {
            return GaiaApps.sendLocateResponse(callback,
              app,
              appName,
              launchPath,
              ep);
          } else if (locales) {
            for (let id in locales) {
              let localisedAppName = locales[id].name;
              if (localisedAppName && normalizedSearchName ===
                GaiaApps.normalizeName(localisedAppName)) {
                return GaiaApps.sendLocateResponse(callback,
                  app,
                  appName,
                  launchPath,
                  ep);
              }
            }
          }
        }
      } else {
        let appName = app.manifest.name;
        let launchPath = app.manifest.launch_path;
        let locales = app.manifest.locales;

        if (normalizedSearchName === GaiaApps.normalizeName(appName)) {
          return GaiaApps.sendLocateResponse(callback,
            app,
            appName,
            launchPath);
        } else if (locales) {
          for (let id in locales) {
            let localisedAppName = locales[id].name;
            if (localisedAppName && normalizedSearchName ===
              GaiaApps.normalizeName(localisedAppName)) {
              return GaiaApps.sendLocateResponse(callback,
                app,
                appName,
                launchPath);
            }
          }
        }
      }
    }
    callback(false);
  },

  locateWithManifestURL: function(manifestURL, entryPoint, aCallback) {
    var callback = aCallback || marionetteScriptFinished;
    var apps = window.wrappedJSObject.applications ||
                window.wrappedJSObject.Applications;
    var app = apps.getByManifestURL(manifestURL);
    var appName, launchPath;

    if (entryPoint) {
      if (app.manifest.entry_points[entryPoint]) {
        appName = app.manifest.entry_points[entryPoint].name;
        launchPath = app.manifest.entry_points[entryPoint].launch_path;
      } else {
        app = null;
      }
    } else {
      appName = app.manifest.name;
      launchPath = app.manifest.launch_path;
    }
    GaiaApps.sendLocateResponse(callback, app, appName, launchPath, entryPoint);
  },

  // Returns the number of running apps.
  // if includeSystemApps is true then system always-running
  // apps (eg Homescreen) will be counted
  numRunningApps: function(includeSystemApps) {
    return Object.keys(GaiaApps.getApps(includeSystemApps)).length;
  },

  isRunning: function(origin) {
    var apps = GaiaApps.getApps(true);
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
            console.log('app with origin \'' + aOrigin + '\' has terminated');
            callback(true);
          },
          function() {
            return !GaiaApps.isRunning(aOrigin);
          }
        );
      });
      console.log('terminating app with origin \'' + aOrigin + '\'');
      window.wrappedJSObject.Service.request('AppWindowManager:kill', aOrigin);
    }
  },

  // Kills all running apps that may be killed by the user, defined as
  // being accessible by the Cards View/Stack Manager
  killAll: function() {
    let originsToClose = [];
    let that = this;

    let apps = GaiaApps.getApps();
    for (let id in apps) {
      let origin = apps[id].origin;
      originsToClose.push(origin);
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

  launch: function(app, appName, launchPath, entryPoint) {
    if (app) {
      let manifestURL = app.manifestURL;
      let origin = app.origin;

      let sendResponse = function() {
        let result = GaiaApps.getDisplayedApp();
        marionetteScriptFinished(result);
      };

      let displayedApp = GaiaApps.getDisplayedApp();
      if ((displayedApp.manifestURL == manifestURL &&
          displayedApp.entryPoint == entryPoint) ||
          (!displayedApp.manifestURL && displayedApp.origin == origin)) {
        console.log(`app with origin: ${displayedApp.origin} and
          manifestURL: ${displayedApp.manifestURL} and
          entryPoint: ${displayedApp.entryPoint} is already running`);
        sendResponse();
      } else {
        window.addEventListener('windowopened', function appOpen() {
          window.removeEventListener('windowopened', appOpen);
          waitFor(
            function() {
              console.log(`app with origin: ${displayedApp.origin} and
                manifestURL: ${displayedApp.manifestURL} and
                entryPoint: ${displayedApp.entryPoint} has launched`);
              sendResponse();
            },
            function() {
              // wait for the displayed app to have expected manifestURL/origin
              let displayedApp = GaiaApps.getDisplayedApp();
              if (displayedApp.manifestURL) {
                return displayedApp.manifestURL == manifestURL &&
                       displayedApp.entryPoint == entryPoint;
              } else {
                return displayedApp.origin == origin;
              }
            }
          );
        });
        console.log('launching app with name \'' + appName + '\'');
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

  /**
   * Returns the currently displayed app.
   * This is more like getDisplayedFrame really,
   * as we return what frame the user is interacting with
   */
  getDisplayedApp: function() {
    let app = window.wrappedJSObject.Service.query('getTopMostWindow');
    if (!app || app.isLockscreen) {
      // fallback to app window.
      app = window.wrappedJSObject.Service
         .query('AppWindowManager.getActiveWindow').getTopMostWindow();
    }

    let currentEntryPoint = null;
    // When browser is on a website, app.manifest is null
    if (app.manifest) {
      let entryPoints = app.manifest.entry_points;
      if (entryPoints) {
        for (let ep in entryPoints) {
          if (entryPoints[ep].launch_path == app.manifest.launch_path) {
            currentEntryPoint = ep;
            break;
          }
        }
      }
    }

    let result = {
      frame: (app.browser) ? app.browser.element : app.frame.firstChild,
      src: (app.browser) ? app.browser.element.src : app.iframe.src,
      name: app.name,
      origin: app.origin,
      manifestURL: app.manifestURL,
      entryPoint: currentEntryPoint
    };
    return result;
  },

  /**
   * Uninstalls the app with the specified name.
   */
  uninstallWithName: function(name) {
    GaiaApps.locateWithName(name, function uninstall(app) {
      if (typeof(app) === 'object') {
        let req = navigator.mozApps.mgmt.uninstall(app);
          req.onsuccess = function() {
          marionetteScriptFinished(true);
        };
        req.onerror = function() {
          marionetteScriptFinished(req.error);
        };
      } else {
        // App was never installed, so nothing to do here
        marionetteScriptFinished(true);
      }
    });
  }
};
