const { 'classes': Cc, 'interfaces': Ci, 'results': Cr, } = Components;

function debug(msg) {
  if (DEBUG)
    dump("-*- " + msg + "\n");
}

function getSubDirectories(directory) {
  let appsDir = Cc["@mozilla.org/file/local;1"]
               .createInstance(Ci.nsILocalFile);
  appsDir.initWithPath(GAIA_DIR);
  appsDir.append(directory);

  let dirs = [];
  let files = appsDir.directoryEntries;
  while (files.hasMoreElements()) {
    let file = files.getNext().QueryInterface(Ci.nsILocalFile);
    if (file.isDirectory()) {
      dirs.push(file.leafName);
    }
  }
  return dirs;
}

function getFileContent(file) {
  let fileStream = Cc['@mozilla.org/network/file-input-stream;1']
                   .createInstance(Ci.nsIFileInputStream);
  fileStream.init(file, 1, 0, false);

  let converterStream = Cc["@mozilla.org/intl/converter-input-stream;1"]
                          .createInstance(Ci.nsIConverterInputStream);
  converterStream.init(fileStream, "utf-8", fileStream.available(),
                       Ci.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);

  let out = {};
  let count = fileStream.available();
  converterStream.readString(count, out);

  let content = out.value;
  converterStream.close();
  fileStream.close();

  return [content, count];
}

function getJSON(root, dir, name) {
  let file = Cc["@mozilla.org/file/local;1"]
               .createInstance(Ci.nsILocalFile);
  file.initWithPath(GAIA_DIR);
  file.append(root);
  file.append(dir);
  file.append(name);
  dump("GET1: " + name + "\n");
  if (!file.exists())
    return null;

  let [content, length] = getFileContent(file);
  return JSON.parse(content);
}

let permissionList = ["power", "sms", "contacts", "telephony",
                      "mozBluetooth", "mozbrowser", "mozApps",
                      "mobileconnection", "mozFM", "systemXHR",
                      "background"];

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

appSrcDirs.forEach(function parseDirectory(directoryName) {
  let directories = getSubDirectories(directoryName);
  directories.forEach(function readManifests(dir) {
    let manifest = getJSON(directoryName, dir, "manifest.webapp");
    if (!manifest)
      return;

    let rootURL = GAIA_SCHEME + dir + "." + GAIA_DOMAIN + (GAIA_PORT ? GAIA_PORT : '');

    let perms = manifest.permissions;
    if (perms) {
      for each(let name in perms) {
        if (permissionList.indexOf(name) == -1) {
          dump("WARNING: permission unknown:" + name + "\n");
          continue;
        }
        dump("name: " + name + "\n");
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
});
