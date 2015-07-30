'use strict';

var hasRunCommands = {};
var gaiaOriginURL = function(name, scheme, domain, port) {
  return scheme + name + '.' + domain + (port ? port : '');
};

exports.Q = require('q');

var joinPath = function() {
  var args = Array.prototype.slice.call(arguments);
    return args.join('/');
  };

exports.joinPath = joinPath;

exports.Commander = function(type) {
  hasRunCommands[type] = [];
  this.run = function(cmds, callback) {
    hasRunCommands[type].push(cmds.join(' '));
    callback && callback();
  };
  this.initPath = function() {
  };
};

exports.killAppByPid = function(appName) {
  hasRunCommands.sh.push('-c adb shell kill ' + appName);
};

exports.hasRunCommands = hasRunCommands;

exports.psParser = function(content) {
  return content;
};

exports.setEnv = function() {
};

exports.getEnvPath = function() {
};

exports.processEvents = function() {
};

var mockNSIFile = function() {
  return {
    clone: mockNSIFile,
    remove: function() {},
    append: function() {}
  };
};

exports.getTempFolder = function() {
  return mockNSIFile();
};

exports.getJSON = function() {
};

exports.gaiaOriginURL = gaiaOriginURL;

exports.gaiaManifestURL = function(name, scheme, domain, port) {
  return gaiaOriginURL(name, scheme, domain, port) + '/manifest.webapp';
};

exports.log = console.log;
exports.getExtension = function(filename) {
  return filename.substr(filename.lastIndexOf('.') + 1).toLowerCase();
};

exports.isSubjectToBranding = function(path) {
  return /shared[\/\\][a-zA-Z]+[\/\\]branding$/.test(path) ||
         /branding[\/\\]initlogo.png/.test(path);
};

exports.isSubjectToDeviceType = function(path) {
  return /locales[\/\\]?[a-zA-Z]*[\/\\]?device_type$/.test(path);
};

exports.cloneJSON = function(obj) {
  return JSON.parse(JSON.stringify(obj));
};

exports.existsInAppDirs =  function(appDirs, appName) {
  var apps = appDirs.split(' ');
  var exists = apps.some(function (appPath) {
    let appFile = {
      leafName: appPath
    };
    return (appName === appFile.leafName);
  });
  return exists;
};

exports.getAppNameRegex = function(buildAppName) {
  return buildAppName === '*' ? /.+/ : new RegExp(buildAppName);
};

exports.scriptLoader = {
  load: function load() {}
};

exports.dirname = function(path) {
  return path.substr(0, path.lastIndexOf('/'));
};

exports.basename = function(path) {
  return path.substr(path.lastIndexOf('/')+1);
};

exports.relativePath = function(from, to) {
  // that's really dummy, but we need it for webapp-optimize tests.
  return to;
};

exports.gaia = {
  getInstance: function(options) {
    var rebuildWebapps = options.rebuildAppDirs.map(function(appDir) {
      return {
        appDirPath: appDir
      };
    });
    return {
      rebuildWebapps: rebuildWebapps
    };
  }
};
