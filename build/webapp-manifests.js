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

  return content;
}

function writeContent(file, content) {
  let stream = Cc["@mozilla.org/network/file-output-stream;1"]
                   .createInstance(Ci.nsIFileOutputStream);
  stream.init(file, 0x02 | 0x08 | 0x20, 0666, 0);
  stream.write(content, content.length);
  stream.close();
}

// Return an nsIFile by joining paths given as arguments
// First path has to be an absolute one
function getFile() {
  let file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
  file.initWithPath(arguments[0]);
  if (arguments.length > 1) {
    for (let i = 1; i < arguments.length; i++) {
      file.append(arguments[i]);
    }
  }
  return file;
}

let webappsTargetDir = Cc["@mozilla.org/file/local;1"]
               .createInstance(Ci.nsILocalFile);
webappsTargetDir.initWithPath(PROFILE_DIR);
// Create profile folder if doesn't exists
if (!webappsTargetDir.exists())
  webappsTargetDir.create(Ci.nsIFile.DIRECTORY_TYPE, parseInt("0755", 8));
// Create webapps folder if doesn't exists
webappsTargetDir.append("webapps");
if (!webappsTargetDir.exists())
  webappsTargetDir.create(Ci.nsIFile.DIRECTORY_TYPE, parseInt("0755", 8));

let manifests = {};
let id = 1;

// Process webapps from GAIA_APP_SRCDIRS folders
let appSrcDirs = GAIA_APP_SRCDIRS.split(' ');
appSrcDirs.forEach(function parseDirectory(srcDir) {
  getSubDirectories(srcDir).forEach(function readManifests(webappSrcDirName) {
    // If BUILD_APP_NAME isn't `*`, we only accept one webapp
    if (BUILD_APP_NAME != "*" && webappSrcDirName != BUILD_APP_NAME)
      return;
    let webappSrcDir = getFile(GAIA_DIR, srcDir, webappSrcDirName);

    // Compute webapp folder name in profile
    let webappTargetDirName = webappSrcDirName + "." + GAIA_DOMAIN;

    // Copy webapp's manifest to the profile
    let manifest = webappSrcDir.clone();
    manifest.append("manifest.webapp");
    let webappTargetDir = webappsTargetDir.clone();
    webappTargetDir.append(webappTargetDirName);
    manifest.copyTo(webappTargetDir, "manifest.webapp");

    // Compute its URL
    let url = GAIA_SCHEME + webappTargetDirName + GAIA_PORT;

    // Add webapp's entry to the webapps global manifest
    manifests[webappTargetDirName] = {
      origin:        url,
      installOrigin: url,
      receipt:       null,
      installTime:   132333986000,
      manifestURL:   url + "/manifest.webapp",
      localId:       id++
    };

  });
});

// Process external webapps from /gaia/external-app/ folder
const EXTERNAL_APPS_DIR = "external-apps";
getSubDirectories(EXTERNAL_APPS_DIR).forEach(function readManifests(webappSrcDirName) {
  // If BUILD_APP_NAME isn't `*`, we only accept one webapp
  if (BUILD_APP_NAME != "*" && webappSrcDirName != BUILD_APP_NAME)
    return;
  let webappSrcDir = getFile(GAIA_DIR, EXTERNAL_APPS_DIR, webappSrcDirName);

  // Compute webapp folder name in profile
  let webappTargetDirName = webappSrcDirName;

  // Copy webapp's manifest to the profile
  let manifest = webappSrcDir.clone();
  manifest.append("manifest.webapp");
  let webappTargetDir = webappsTargetDir.clone();
  webappTargetDir.append(webappTargetDirName);
  manifest.copyTo(webappTargetDir, "manifest.webapp");

  let origin = webappSrcDir.clone();
  origin.append("origin");

  let url = getFileContent(origin);
  // Strip any leading/ending spaces
  url = url.replace(/^\s+|\s+$/, "");

  // Add webapp's entry to the webapps global manifest
  manifests[webappTargetDirName] = {
    origin:        url,
    installOrigin: url,
    receipt:       null,
    installTime:   132333986000,
    manifestURL:   url + "/manifest.webapp",
    localId:       id++
  };
});

// Write webapps global manifest
let manifestFile = webappsTargetDir.clone();
manifestFile.append("webapps.json");
// stringify json with 2 spaces indentation
writeContent(manifestFile, JSON.stringify(manifests, null, 2) + "\n");
