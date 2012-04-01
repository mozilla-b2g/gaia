
const { 'classes': Cc, 'interfaces': Ci, 'results': Cr, } = Components;

let CC = Components.Constructor;
let Namespace = CC("@mozilla.org/network/application-cache-namespace;1",
                   "nsIApplicationCacheNamespace",
                   "init");

/*
 * This method will map the profile directory to the directory
 * defined by the const PROFILE_DIR.
 * PROFILE_DIR is set by the Makefile and can be equal to:
 *  1. the current running directory or,
 *  2. the value of the environment variable PROFILE_DIR.
 */
(function registerProfileDirectory() {
  let directoryProvider = {
    getFile: function provider_getFile(prop, persistent) {
      persistent.value = true;
      if (prop != "cachePDir")
        throw Cr.NS_ERROR_FAILURE;

      let file = Cc["@mozilla.org/file/local;1"]
                   .createInstance(Ci.nsILocalFile)
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


/*
 * Compile Gaia into an offline cache sqlite database.
 */
function storeCache(id, url, content, count) {
  const nsICache = Ci.nsICache;
  let cacheService = Cc["@mozilla.org/network/cache-service;1"]
                       .getService(Ci.nsICacheService);
  let session = cacheService.createSession(id, nsICache.STORE_OFFLINE, true);
  let cacheEntry = session.openCacheEntry(url, nsICache.ACCESS_WRITE, false);
  cacheEntry.setMetaDataElement("request-method", "GET");
  cacheEntry.setMetaDataElement("response-head", "GET / HTTP/1.1\r\n");
  cacheEntry.setExpirationTime(0); // will force an update. the default expiration time is way too far in the future.

  let outputStream = cacheEntry.openOutputStream(0);
  
  let bufferedOutputStream = Cc["@mozilla.org/network/buffered-output-stream;1"]
                              .createInstance(Ci.nsIBufferedOutputStream);
  bufferedOutputStream.init(outputStream, count);
  bufferedOutputStream.writeFrom(content, count);

  bufferedOutputStream.close();
  outputStream.close();
  cacheEntry.markValid();
  cacheEntry.close();
}

function getDirectories() {
  let appsDir = Cc["@mozilla.org/file/local;1"]
               .createInstance(Ci.nsILocalFile);
  appsDir.initWithPath(GAIA_DIR);  
  appsDir.append('apps');

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

function getCachedFiles(file) {
  let converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"]  
                    .createInstance(Ci.nsIScriptableUnicodeConverter);  
  converter.charset = "UTF-8";  
  
  let fis = Cc["@mozilla.org/network/file-input-stream;1"]  
              .createInstance(Ci.nsIFileInputStream);  
  fis.init(file, -1, -1, 0);  

  let files = [];
  
  let lis = fis.QueryInterface(Ci.nsILineInputStream);  
  let lineData = {};  
  let hasMore = false;
  do {  
    hasMore = lis.readLine(lineData);  
    let line = converter.ConvertToUnicode(lineData.value);  
  
    if (/^#/.test(line) || !line.length)
      continue;

    switch (line) {
      case 'CACHE MANIFEST':
        continue;
        break;
      case 'NETWORK:':
        hasMore = false;
        continue;
        break;
    }

    files.push(line);
  
  } while (hasMore);
  fis.close(); 

  return files;
}

function getFileContent(file) {
  let fileStream = Cc['@mozilla.org/network/file-input-stream;1']  
                   .createInstance(Ci.nsIFileInputStream);  
  fileStream.init(file, 1, 0, false);

  if (!(/\.html$/.test(file.path))) {
    return [fileStream, fileStream.available()];
  }

  let converterStream = Cc["@mozilla.org/intl/converter-input-stream;1"]
                          .createInstance(Ci.nsIConverterInputStream);
  converterStream.init(fileStream, "utf-8", fileStream.available(),
                       Ci.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);

  let out = {};  
  converterStream.readString(fileStream.available(), out);  

  let content = out.value;  
  converterStream.close();  
  fileStream.close();

  let uconv = Cc["@mozilla.org/intl/scriptableunicodeconverter"]
                .createInstance(Ci.nsIScriptableUnicodeConverter);
  uconv.charset = "utf-8";

  let inputStream = uconv.convertToInputStream(content);
  let count = inputStream.available();

  return [inputStream, count];
}

let applicationCacheService = Cc["@mozilla.org/network/application-cache-service;1"]
                                .getService(Ci.nsIApplicationCacheService);

let directories = getDirectories();
directories.forEach(function generateAppCache(dir) {
  let domain = "http://" + dir + "." + GAIA_DOMAIN;
  let manifest = Cc["@mozilla.org/file/local;1"]
                   .createInstance(Ci.nsILocalFile);
  manifest.initWithPath(GAIA_DIR);
  manifest.append('apps');

  const base = manifest.path;
  manifest.append(dir);

  const root = manifest.path;
  manifest.append("manifest.appcache");

  if (!manifest.exists())
    return;

  // Get the url for the manifest. At some points the root
  // domain should be extracted from manifest.webapp
  let applicationCache =
    applicationCacheService.createApplicationCache(domain + "/manifest.appcache");
  applicationCache.activate();

  print ("\nCompiling " + dir + " (" + domain + ")");

  let hasWebapi = false;

  let files = getCachedFiles(manifest);
  files.forEach(function appendFile(name) {
    // Check that the file exists
    let file = Cc["@mozilla.org/file/local;1"]
                 .createInstance(Ci.nsILocalFile);
    file.initWithPath(root);

    if (name == ("http://" + GAIA_DOMAIN + "/webapi.js")) {
      hasWebapi = true;
      return;
    }

    let paths = name.split("/");
    for (let i = 0; i < paths.length; i++) {
      file.append(paths[i]);
    }

    if (!file.exists()) {
      let msg = "File " + file.path + " exists in the manifest but does not " +
                "points to a real file.";
      throw new Error(msg);
    }

    let documentSpec = domain;
    for (let i = 0; i < paths.length; i++) {
      documentSpec += "/";
      if (paths[i] != "index.html")
         documentSpec += paths[i];
    }
  
    let [content, length] = getFileContent(file);
    storeCache(applicationCache.clientID, documentSpec, content, length);

    // Set the item type
    let itemType = Ci.nsIApplicationCache.ITEM_EXPLICIT;
    if (file.leafName == "index.html")
      itemType = Ci.nsIApplicationCache.ITEM_IMPLICIT;

    print (file.path + " -> " + documentSpec + " (" + itemType + ")");

    applicationCache.markEntry(documentSpec, itemType);
  });

  // NETWORK:
  // http://*
  // https://*
  let array = Cc["@mozilla.org/array;1"]
                .createInstance(Ci.nsIArray);
  array.QueryInterface(Ci.nsIMutableArray);

  let bypass = Ci.nsIApplicationCacheNamespace.NAMESPACE_BYPASS;
  array.appendElement(new Namespace(bypass, 'http://*', ''), false);
  array.appendElement(new Namespace(bypass, 'https://*', ''), false);
  applicationCache.addNamespaces(array);

  // Store the appcache file
  let documentSpec = domain + '/manifest.appcache';

  let file = Cc["@mozilla.org/file/local;1"]
               .createInstance(Ci.nsILocalFile);
  file.initWithPath(root);
  file.append('manifest.appcache');

  if (file.exists()) {
    let [content, length] = getFileContent(file);
    storeCache(applicationCache.clientID, documentSpec, content, length);
    itemType = Ci.nsIApplicationCache.ITEM_MANIFEST;
    applicationCache.markEntry(documentSpec, itemType);

    print (file.path + " -> " + documentSpec + " (" + itemType + ")");
  }

  if (hasWebapi) {
    let file = Cc["@mozilla.org/file/local;1"]
                 .createInstance(Ci.nsILocalFile);
    file.initWithPath(GAIA_DIR);
    file.append("webapi.js");

    if (!file.exists()) {
      let msg = "File " + file.path + " exists in the manifest but does not " +
                "points to a real file.";
      throw new Error(msg);
    }

    let documentSpec = "http://" + GAIA_DOMAIN + "/webapi.js"
    print (file.path + " -> " + documentSpec);

    let [content, length] = getFileContent(file);
    storeCache(applicationCache.clientID, documentSpec, content, length);
    applicationCache.markEntry(documentSpec, Ci.nsIApplicationCache.ITEM_FOREIGN);
  }
});
