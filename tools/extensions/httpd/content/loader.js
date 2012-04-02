
const CC = Components.Constructor;
const LocalFile = CC('@mozilla.org/file/local;1',
                     'nsILocalFile',
                     'initWithPath');

function startupHttpd(baseDir, port) {
  const httpdURL = 'chrome://httpd.js/content/httpd.js';
  let httpd = {};
  Services.scriptloader.loadSubScript(httpdURL, httpd);
  let server = new httpd.nsHttpServer();
  server.registerDirectory('/', new LocalFile(baseDir));
  server.registerContentType('appcache', 'text/cache-manifest');
  server.start(port);

  // Add {appname}.domain.tld:port to the list of domains handle by httpd
  let identity = server.identity;
  let scheme = 'http';

  let host = '@GAIA_DOMAIN@';
  identity.add(scheme, host, port);

  let directories = getDirectories(baseDir);
  directories.forEach(function appendDir(name) {
    identity.add(scheme, name + '.' + host, port);
  });
}

function getDirectories(dir) {
  let appsDir = Cc["@mozilla.org/file/local;1"]
               .createInstance(Ci.nsILocalFile);
  appsDir.initWithPath(dir);  
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

startupHttpd('@GAIA_DIR@', @GAIA_PORT@);

