/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var GaiaApps = {
  normalizeName: function(name) {
    return name.replace(/[- ]+/g, '').toLowerCase();
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

  locateWithName: function(name, callback=marionetteScriptFinished) {
    function sendResponse(app, appName, entryPoint) {
      if (callback === marionetteScriptFinished) {
        if (typeof(app) === 'object') {
          var result = {
            name: app.manifest.name,
            origin: app.origin,
            entryPoint: entryPoint || null,
            normalizedName: appName
          };
          callback(result);
        } else {
          callback(false);
        }
      } else {
        callback(app, appName, entryPoint);
      }
    }

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
              return sendResponse(app, appName, ep);
            }
          }
        } else {
          let appName = app.manifest.name;

          if (normalizedSearchName === GaiaApps.normalizeName(appName)) {
            return sendResponse(app, appName);
          }
        }
      }
      callback(false);
    }
  },

  /**
   * Returns the number of running apps.
   */
  numRunningApps: function() {
    let count = 0;
    let runningApps = window.wrappedJSObject.WindowManager.getRunningApps();
    for (let origin in runningApps) {
      count++;
    }
    return count;
  },

  /**
   * Kills all running apps, except the homescreen.
   */
  killAll: function() {
    let originsToClose = [];
    let that = this;
    window.addEventListener('appterminated', function gt_onAppTerminated(evt) {
      let index = originsToClose.indexOf(evt.detail.origin);
      if (index > -1) {
        originsToClose.splice(index, 1);
      }
      if (!originsToClose.length) {
        window.removeEventListener('appterminated', gt_onAppTerminated);
        // Even after the 'appterminated' event has been fired for an app,
        // it can still exist in the apps list, so wait until 1 or fewer
        // apps are running (since we don't close the homescreen app).
        waitFor(
          function() { marionetteScriptFinished(true); },
          function() { return that.numRunningApps() <= 1; }
        );
      }
    });
    let runningApps = window.wrappedJSObject.WindowManager.getRunningApps();
    for (let origin in runningApps) {
      if (origin.indexOf('homescreen') == -1) {
        originsToClose.push(origin);
        window.wrappedJSObject.WindowManager.kill(origin);
      }
    }
  },

  /**
   * Launches app with the specified name (e.g., 'Calculator'); returns the
   * app frame's id if successful, false if the app can't be found, or times
   * out if the app frame can't be found after launching the app.
   */
  launchWithName: function(name) {
    GaiaApps.locateWithName(name, function(app, appName, entryPoint) {
      if (app) {
        let runningApps = window.wrappedJSObject.WindowManager.getRunningApps();
        let origin = GaiaApps.getRunningAppOrigin(appName);
        let alreadyRunning = !!origin;

        app.launch(entryPoint || null);

        function sendResponse(origin) {
          let app = runningApps[origin];
          marionetteScriptFinished({frame: app.frame.id,
                                    src: app.frame.src,
                                    name: app.name,
                                    origin: origin});
        }

        waitFor(
          function() {
            if (alreadyRunning) {
              // return the app's frame id
              sendResponse(origin);
            }
            else {
              // wait until the new iframe sends the mozbrowserfirstpaint event
              let frame = runningApps[origin].frame;
              if (frame.dataset.unpainted) {
                window.addEventListener('appopen', function firstpaint() {
                  window.removeEventListener('appopen', firstpaint);
                  sendResponse(origin);
                });
              }
              else {
                sendResponse(origin);
              }
            }
          },
          // wait until the app is found in the running apps list
          function() {
            origin = GaiaApps.getRunningAppOrigin(appName);
            return !!origin;
          }
        );
      } else {
        marionetteScriptFinished(false);
      }
    });
  }
};
