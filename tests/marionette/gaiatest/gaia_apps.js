/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Launches app with the specified name (e.g., 'Calculator'); returns the
 * app frame's id if successful, false if the app can't be found, or times
 * out if the app frame can't be found after launching the app.
 */
function launchAppWithName(name) {
  let appsReq = navigator.mozApps.mgmt.getAll();
  appsReq.onsuccess = function() {
    let apps = appsReq.result;
    let normalizedSearchName = name.replace(/[- ]+/g, '').toLowerCase();

    for (let i = 0; i < apps.length; i++) {
      let app = apps[i];
      let normalizedAppName =
            app.manifest.name.replace(/[- ]+/g, '').toLowerCase();
      if (normalizedSearchName === normalizedAppName) {
        app.launch();
        let runningApps = window.wrappedJSObject.WindowManager.getRunningApps();
        let launchedApp;

        waitFor(
          // return the app's frame id
          function() {
            marionetteScriptFinished(launchedApp.frame.id);
            return;
          },
          // wait until the app is found in the running apps list
          function() {
            for (let property in runningApps) {
              if (runningApps[property].name == app.manifest.name) {
                launchedApp = runningApps[property];
              }
            }
            return !!launchedApp;
          }
        );

        return;
      }
    }
    marionetteScriptFinished(false);
  }
}
