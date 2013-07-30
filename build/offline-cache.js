let Namespace = CC('@mozilla.org/network/application-cache-namespace;1',
                   'nsIApplicationCacheNamespace',
                   'init');
const nsICache = Ci.nsICache;
const nsIApplicationCache = Ci.nsIApplicationCache;
const applicationCacheService = Cc['@mozilla.org/network/application-cache-service;1']
                                .getService(Ci.nsIApplicationCacheService);

function log(str) {
  dump(' +-+ OfflineCache: ' + str + '\n');
}

/*
 * Compile Gaia into an offline cache sqlite database.
 */
function storeCache(applicationCache, url, file, itemType) {
  let session = Services.cache.createSession(applicationCache.clientID,
                                             nsICache.STORE_OFFLINE, true);
  session.asyncOpenCacheEntry(url, nsICache.ACCESS_WRITE, {
    onCacheEntryAvailable: function (cacheEntry, accessGranted, status) {
      cacheEntry.setMetaDataElement('request-method', 'GET');
      cacheEntry.setMetaDataElement('response-head', 'HTTP/1.1 200 OK\r\n');
      // Force an update. the default expiration time is way too far in the future:
      //cacheEntry.setExpirationTime(0);

      let outputStream = cacheEntry.openOutputStream(0);

      // Input-Output stream machinery in order to push nsIFile content into cache
      let inputStream = Cc['@mozilla.org/network/file-input-stream;1']
                       .createInstance(Ci.nsIFileInputStream);
      inputStream.init(file, 1, -1, null);
      let bufferedOutputStream = Cc['@mozilla.org/network/buffered-output-stream;1']
                                  .createInstance(Ci.nsIBufferedOutputStream);
      bufferedOutputStream.init(outputStream, 1024);
      bufferedOutputStream.writeFrom(inputStream, inputStream.available());
      bufferedOutputStream.flush();
      bufferedOutputStream.close();
      outputStream.close();
      inputStream.close();

      cacheEntry.markValid();
      log (file.path + ' -> ' + url + ' (' + itemType + ')');
      applicationCache.markEntry(url, itemType);
      cacheEntry.close();
    }
  });
}

function getCachedURLs(origin, appcacheFile) {
  let urls = [];
  let lines = getFileContent(appcacheFile).split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (/^#/.test(line) || !line.length)
      continue;
    if (line == 'CACHE MANIFEST')
      continue;
    if (line == 'CACHE:')
      continue;
    if (line == 'NETWORK:')
      break;
    // Prepend webapp origin in case of absolute path
    if (line[0] == '/')
      urls.push(origin + line.substring(1));
    // Just pass along the url, if we have one
    else if (line.substr(0, 4) == 'http')
      urls.push(line);
    else
      throw new Error('Invalid line in appcache manifest:\n' + line +
                      '\nFrom: ' + appcacheFile.path);
  }
  return urls;
}

let webapps = getJSON(getFile(PROFILE_DIR, 'webapps', 'webapps.json'));

Gaia.externalWebapps.forEach(function (webapp) {
  // Process only webapp with a `appcache_path` field in their manifest.
  if (!('appcache_path' in webapp.manifest))
    return;

  // Get the nsIFile for the appcache file by using `origin` file and
  // `appcache_path` field of the manifest in order to find it in `cache/`.
  let originDomain = webapp.origin.replace(/^https?:\/\//, '');
  let appcachePath = 'cache/' + originDomain + webapp.manifest.appcache_path;
  let appcacheURL = webapp.origin +
                    webapp.manifest.appcache_path.replace(/^\//, '');
  let appcacheFile = webapp.buildDirectoryFile.clone();
  appcachePath.split('/').forEach(function (name) {
    appcacheFile.append(name);
  });
  if (!appcacheFile.exists())
    throw new Error('Unable to find application cache manifest: ' +
                    appcacheFile.path);

  // Retrieve generated webapp id from platform profile file build by
  // webapp-manifest.js; in order to allow the webapp to use offline cache.
  let appId = webapps[webapp.sourceDirectoryName].localId;
  let principal = Services.scriptSecurityManager.getAppCodebasePrincipal(
                    Services.io.newURI(webapp.origin, null, null),
                    appId, false);
  Services.perms.addFromPrincipal(principal, 'offline-app',
                                  Ci.nsIPermissionManager.ALLOW_ACTION);

  // Get the url for the manifest. At some points the root
  // domain should be extracted from manifest.webapp.
  // See netwerk/cache/nsDiskCacheDeviceSQL.cpp : AppendJARIdentifier
  // The group ID contains application id and 'f' for not being hosted in
  // a browser element, but a mozbrowser iframe.
  let groupID = appcacheURL + '#' + appId + '+f';
  let applicationCache = applicationCacheService.createApplicationCache(groupID);
  applicationCache.activate();

  log ('Compiling (' + webapp.domain + ')');

  let urls = getCachedURLs(webapp.origin, appcacheFile);
  urls.forEach(function appendFile(url) {
    // Get this nsIFile out of its relative path
    let path = url.replace(/https?:\/\//, '');
    let file = webapp.buildDirectoryFile.clone();
    file.append('cache');
    let paths = path.split('/');
    for (let i = 0; i < paths.length; i++) {
      file.append(paths[i]);
    }

    if (!file.exists()) {
      let msg = 'File ' + file.path + ' exists in the manifest but does not ' +
                'points to a real file.';
      throw new Error(msg);
    }

    // TODO: use ITEM_IMPLICIT for launch_path, if it occurs to be important.
    let itemType = nsIApplicationCache.ITEM_EXPLICIT;
    storeCache(applicationCache, url, file, itemType);
  });

  // Store the appcache file
  storeCache(applicationCache, appcacheURL, appcacheFile,
             nsIApplicationCache.ITEM_MANIFEST);

  // NETWORK:
  // http://*
  // https://*
  let array = Cc['@mozilla.org/array;1'].createInstance(Ci.nsIMutableArray);
  let bypass = Ci.nsIApplicationCacheNamespace.NAMESPACE_BYPASS;
  array.appendElement(new Namespace(bypass, 'http://*/', ''), false);
  array.appendElement(new Namespace(bypass, 'https://*/', ''), false);
  applicationCache.addNamespaces(array);
});


// Wait for cache to be filled before quitting
if (Gaia.engine === 'xpcshell') {
  let thread = Services.tm.currentThread;
  while (thread.hasPendingEvents()) {
    thread.processNextEvent(true);
  }
}
