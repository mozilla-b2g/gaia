
'use strict';

function log(msg) {
  //dump("-*- Permission.js - " + msg + "\n");
}

let permissionList = ["power", "sms", "contacts", "telephony",
                      "mozBluetooth", "browser", "mozApps",
                      "mobileconnection", "mozFM", "systemXHR",
                      "background", "settings", "offline-app",
                      "indexedDB-unlimited", "alarm", "camera",
                      "fmradio", "devicestorage", "voicemail",
                      "pin-app", "wifi-manage", "geolocation",
                      "webapps-manage", "desktop-notification",
                      "device-storage", "alarms", "attention",
                      "content-camera"];

let commonPermissionList = ['offline-app', 'indexedDB-unlimited',
                            'webapps-manage', 'pin-app',
                            'desktop-notification'];

Gaia.webapps.forEach(function (webapp) {
  let manifest = webapp.manifest;
  let rootURL = webapp.url;

  let perms = commonPermissionList.concat(manifest.permissions);

  if (perms) {
    for each(let name in perms) {
      if (permissionList.indexOf(name) == -1) {
        dump("WARNING: permission unknown:" + name + "\n");
        continue;
      }
      log("name: " + name + "\n");
      let uri = Services.io.newURI(rootURL, null, null);
      log("add permission: " + rootURL + ", " + name);
      Services.perms.add(uri, name, Ci.nsIPermissionManager.ALLOW_ACTION);

      // special case for the telephony API which needs full URLs
      if (name == 'telephony') {
        if (manifest.background_page) {
          let uri = Services.io.newURI(rootURL + manifest.background_page, null, null);
          log("add permission: " + rootURL + manifest.background_page + ", " + name);
          Services.perms.add(uri, name, Ci.nsIPermissionManager.ALLOW_ACTION);
        }
      }
      if (manifest.attention_page) {
        let uri = ioservice.newURI(rootURL + manifest.attention_page, null, null);
        log("add permission: " + rootURL + manifest.attention_page+ ", " + name);
        Services.perms.add(uri, name, Ci.nsIPermissionManager.ALLOW_ACTION);
      }
    }
  }
});
