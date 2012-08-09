
function debug(msg) {
  if (DEBUG)
    dump("-*- " + msg + "\n");
}

let permissionList = ["power", "sms", "contacts", "telephony",
                      "mozBluetooth", "mozbrowser", "mozApps",
                      "mobileconnection", "mozFM", "systemXHR",
                      "background", "settings", "offline-app",
                      "indexedDB-unlimited", "alarm", "camera",
                      "fmradio", "devicestorage", "voicemail",
                      "pin-app", "wifi-manage", "geolocation",
                      "webapps-manage", "desktop-notification"];

let commonPermissionList = ['offline-app', 'indexedDB-unlimited',
                            'webapps-manage', 'pin-app',
                            'desktop-notification'];

let appSrcDirs = GAIA_APP_SRCDIRS.split(' ');

(function registerProfileDirectory() {

  let directoryProvider = {
    getFile: function provider_getFile(prop, persistent) {
      persistent.value = true;
      if (prop != "ProfD" && prop != "ProfLDS") {
        throw Cr.NS_ERROR_FAILURE;
      }

      let file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile)
      file.initWithPath(PROFILE_DIR);
      return file;
    },

    QueryInterface: function provider_queryInterface(iid) {
      if (iid.equals(Ci.nsIDirectoryServiceProvider) ||
          iid.equals(Ci.nsISupports)) {
        return this;
      }
      throw Cr.NS_ERROR_NO_INTERFACE;
    }
  };

  Cc["@mozilla.org/file/directory_service;1"]
    .getService(Ci.nsIProperties)
    .QueryInterface(Ci.nsIDirectoryService)
    .registerProvider(directoryProvider);
})();

let permissionManager = Components.classes["@mozilla.org/permissionmanager;1"].getService(Ci.nsIPermissionManager);
let ioservice = Components.classes["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);

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
      debug("name: " + name + "\n");
      let uri = ioservice.newURI(rootURL, null, null);
      debug("add permission: " + rootURL + ", " + name);
      permissionManager.add(uri, name, Ci.nsIPermissionManager.ALLOW_ACTION);

      // special case for the telephony API which needs full URLs
      if (name == 'telephony') {
        if (manifest.background_page) {
          let uri = ioservice.newURI(rootURL + manifest.background_page, null, null);
          debug("add permission: " + rootURL + manifest.background_page + ", " + name);
          permissionManager.add(uri, name, Ci.nsIPermissionManager.ALLOW_ACTION);
        }
      }
      if (manifest.attention_page) {
        let uri = ioservice.newURI(rootURL + manifest.attention_page, null, null);
        debug("add permission: " + rootURL + manifest.attention_page+ ", " + name);
        permissionManager.add(uri, name, Ci.nsIPermissionManager.ALLOW_ACTION);
      }
    }
  }
});
