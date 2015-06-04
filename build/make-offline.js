// Inspired by https://github.com/telefonicaid/gaia/tree/hosted-web

'use strict';

var utils = require('./utils');

var isResource = function([resource, relativePath]) {
  return resource.isFile() && !resource.isHidden() && !isTest(relativePath);
}

// TODO: Take a look at webapp-zip.js and use the same exclussion factors
// to list resources.
var isTest = function(path) {
  return /^\/test/.test(path);
}

var OfflineEnabler = function(options) {
  this.webapp = options.webapp;
  this.buildDir = utils.getFile(this.webapp.buildDirectoryFilePath);
  this.shared = utils.gaia.getInstance(options).sharedFolder;
  this.swwDir = utils.getFile(this.shared.path, 'js', 'sww');
};

OfflineEnabler.prototype.execute = function() {
  this.createResourcesFile();
  this.addServiceWorkerWare();
  this.addWorkerToDOM();
};

OfflineEnabler.prototype.createResourcesFile = function() {
  var appDir = this.buildDir;
  var resources = utils.ls(appDir, true)
    .map(res => [res, res.path.substr(appDir.path.length)])
    .filter(isResource)
    .map(([_, relativePath]) => relativePath);

  var target = utils.getFile(this.buildDir.path, '_files.js');

  var contents =
    'var kCacheFiles = [\n' +
    '  ' + resources.map(res => JSON.stringify(res)).join(',\n  ') +
    '\n];';

  utils.writeContent(target, contents);
};

OfflineEnabler.prototype.addServiceWorkerWare = function() {
  this.copyLibrary();
  this.copyWorker();
  this.copyRegistration();
};

OfflineEnabler.prototype.copyLibrary = function() {
  var target = utils.getFile(this.buildDir.path, 'shared', 'js', 'sww');
  this.copyFromSWW('sww.js', target);
};

OfflineEnabler.prototype.copyWorker = function() {
  this.copyFromSWW('_sw.js');
};

OfflineEnabler.prototype.copyRegistration = function() {
  this.copyFromSWW('_register.js');
};

OfflineEnabler.prototype.copyFromSWW = function (what, where) {
  where = where || this.buildDir;
  var source = utils.getFile(this.swwDir.path, what);
  utils.copyFileTo(source.path, where.path, source.leafName);
};

// TODO: Not implemented for multi entry point applications. Should we?
OfflineEnabler.prototype.addWorkerToDOM = function() {
  var entryPoint = this.getEntryPoint();
  if (!entryPoint.exists()) {
    utils.log('No entry point found. Aborting...');
    return;
  }

  var dom = utils.getDocument(utils.getFileContent(entryPoint));
  this.addWorkerScript(dom);
  utils.writeContent(entryPoint, utils.serializeDocument(dom));
};

OfflineEnabler.prototype.getEntryPoint = function() {
  var manifestLaunchpath = this.webapp.manifest.launch_path;
  var launchPath = manifestLaunchpath || 'index.html';
  launchPath = launchPath.replace(/^\//,'');
  return utils.getFile(this.buildDir.path, launchPath);
};

OfflineEnabler.prototype.addWorkerScript = function(dom) {
  var script = dom.createElement('SCRIPT');
  script.src = '_register.js';
  script.type = 'text/javascript';
  dom.head.insertBefore(script, dom.head.firstChild);
}

function execute(options) {
  (new OfflineEnabler(options)).execute();
}

exports.execute = execute;
