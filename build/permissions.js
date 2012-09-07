
'use strict';

function log(msg) {
  //dump("-*- Permission.js - " + msg + "\n");
}

let permissionList = ["power", "sms", "contacts", "telephony",
                      "mozBluetooth", "browser", "mozApps",
                      "mobileconnection", "mozFM", "systemXHR",
                      "background", "backgroundservice", "settings", "offline-app",
                      "indexedDB-unlimited", "alarm", "camera",
                      "fmradio", "devicestorage", "voicemail",
                      "pin-app", "wifi-manage", "wifi", "geolocation",
                      "webapps-manage", "desktop-notification",
                      "device-storage", "alarms", "alarm", "attention",
                      "content-camera", "camera", "tcp-socket", "bluetooth"];

let commonPermissionList = ['offline-app', 'indexedDB-unlimited',
                            'pin-app',
                            'desktop-notification'];

let secMan = Cc["@mozilla.org/scriptsecuritymanager;1"]
               .getService(Ci.nsIScriptSecurityManager)

// This file is generated by build/webapp-manifests.js.
// We need to read it to get the localId of each webapp.
let webapps = getJSON(getFile(PROFILE_DIR, "webapps", "webapps.json"));

Gaia.webapps.forEach(function (webapp) {
  let manifest = webapp.manifest;
  let rootURL = webapp.url;
  let appId = webapps[webapp.domain].localId;

  let principal = secMan.getAppCodebasePrincipal(Services.io.newURI(rootURL, null, null),
                                                 appId, false);

  let perms = commonPermissionList.concat(manifest.permissions);

  if (perms) {
    for each(let name in perms) {
      if (permissionList.indexOf(name) == -1) {
        dump("WARNING: permission unknown:" + name + "\n");
        continue;
      }
      log("name: " + name + "\n");
      log("add permission: " + rootURL + " (" + appId + "), " + name);
      Services.perms.addFromPrincipal(principal, name, Ci.nsIPermissionManager.ALLOW_ACTION);

      // special case for the telephony API which needs full URLs
      if (name == 'telephony') {
        if (manifest.background_page) {
          let principal = secMan.getAppCodebasePrincipal(Services.io.newURI(rootURL + manifest.background_page, null, null),
                                                         appId, false);
          log("add permission: " + rootURL + manifest.background_page + " (" + appId + "), " + name);
          Services.perms.addFromPrincipal(principal, name, Ci.nsIPermissionManager.ALLOW_ACTION);
        }
      }
      if (manifest.attention_page) {
        let principal = secMan.getAppCodebasePrincipal(Services.io.newURI(rootURL + manifest.attention_page, null, null),
                                                       appId, false);
        log("add permission: " + rootURL + manifest.attention_page + " (" + appId + "), " + name);
        Services.perms.addFromPrincipal(principal, name, Ci.nsIPermissionManager.ALLOW_ACTION);
      }
    }
  }
});
