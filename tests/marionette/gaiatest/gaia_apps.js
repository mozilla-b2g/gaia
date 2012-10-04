/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

function getRunningAppOrigin(name) {
  let runningApps = window.wrappedJSObject.WindowManager.getRunningApps();
  let origin;

  for (let property in runningApps) {
    if (runningApps[property].name == name) {
      origin = property;
    }
  }
  return origin;
}

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
        let runningApps = window.wrappedJSObject.WindowManager.getRunningApps();
        let origin = getRunningAppOrigin(app.manifest.name);
        let alreadyRunning = !!origin;

        app.launch();

        function sendResponse(origin) {
          let app = runningApps[origin];
          marionetteScriptFinished({frame: app.frame.id,
                                    src: app.frame.src,
                                    name: app.manifest.name,
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
                frame.addEventListener('mozbrowserfirstpaint', function firstpaint() {
                  frame.removeEventListener('mozbrowserfirstpaint', firstpaint);
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
            origin = getRunningAppOrigin(app.manifest.name);
            return !!origin;
          }
        );

        return;
      }
    }
    marionetteScriptFinished(false);
  }
}
