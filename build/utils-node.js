'use strict';

/**
 * This file contains all Node.js version of utils functions.
 * Since we're stil in the progress to migrate to Node.js, the
 * missing functions in this file should be in the 'utils-xpc.js'
 *
 * About documents:
 * Users can find comments in the 'utils-xpc.js',
 * which contains the complete functions used in 'utils.js'
 */

/* global require, exports, Buffer */

var utils = require('./utils.js');
var path = require('path');
var sh = require('child_process').exec;
var fs = require('fs');
var AdmZip = require('adm-zip');
var Q = require('q');
var os = require('os');

function joinPath() {
  var src = path.join.apply(path, arguments);
  console.log(src);
  return src;
}

function getFile() {
  var src = path.join.apply(path, arguments);
  var fileStat;
  try {
    fileStat = fs.statSync(src);
  } catch (e) {
    // In order to have compability with xpcshell interface,
    // we just simply let fileStat undefined and don't need
    // to do anything here.
  }
  return {
    exists: function() {
      return !!fileStat;
    },
    isDirectory: function() {
      return !!fileStat && fileStat.isDirectory();
    },
    isFile: function() {
      return !!fileStat && fileStat.isFile();
    },
    path: src
  };
}

function getFileContent(file, type) {
  if (file.exists() && file.isFile()){
    return fs.readFileSync(file.path, {encoding: type || 'utf-8'});
  }
}

function Commander(cmd) {

  this.initPath = function(p) {};

  this.run = function(args, callback) {
    var q = Q.defer();
    var cmds = args.join(' ');

    // In *nix and OSX version commands are run via sh -c YOUR_COMMAND,
    // but in Windows commands are run via cmd /C YOUR_COMMAND,
    // so, we just let execSync module to handle the difference.
    if (cmd === 'sh') {
      cmds = cmds.replace(/^-c/, '');
    } else {
      cmds = cmd + ' ' + cmds;
    }
    console.log(cmds);
    // XXX: Most cmds should run synchronously, we should use either promise
    //      pattern inside each script or find a sync module which doesn't
    //      require recompile again since TPBL doesn't support that.
    sh(cmds, function(err, stdout, stderr) {
      if (err === null && typeof callback === 'function') {
        callback(stdout);
      }
      q.resolve();
    });
    return q.promise;
  };
}

function readZipManifest(file) {
  var zip = new AdmZip(joinPath(file.path, 'application.zip'));
  var zipEntries = zip.getEntries();
  var content = {};
  for (var i = 0; i < zipEntries.length; i++) {
    var zipEntry = zipEntries[i];
    if (zipEntry.entryName == 'manifest.webapp') {
      content = JSON.parse(zipEntry.getData().toString('utf8'));
      break;
    }
  }
  return content;
}

function killAppByPid(appName) {
  sh('adb shell b2g-ps', function(err, stdout, stderr) {
    if (!err && stdout) {
      var psMap = utils.psParser(stdout);
      if (psMap[appName] && psMap[appName].PID) {
        sh('adb shell kill ' + psMap[appName].PID);
      }
    }
  });
}

function resolve(path, gaiaDir) {
  return getFile(gaiaDir, path);
}

function getFileAsDataURI(file) {
  var data = getFileContent(file, 'base64');
  return new Buffer(data, 'binary').toString('base64');
}

function getJSON(file) {
  var data = getFileContent(file, 'utf-8');
  return JSON.parse(data);
}

function processEvents() {}

function writeContent(file, content) {
  fs.writeFileSync(file.path, content);
}

function getLocaleBasedir(original) {
  return (os.platform().indexOf('win') !== -1) ?
    original.replace('/', '\\', 'g') : original;
}

function existsInAppDirs(appDirs, appName) {
  var apps = appDirs.split(' ');
  var exists = apps.some(function (appPath) {
    let appFile = getFile(appPath);
    return (appName === appFile.leafName);
  });
  return exists;
}

var Services = {};

exports.Services = Services;
exports.joinPath = joinPath;
exports.getFile = getFile;
exports.getFileContent = getFileContent;
exports.Commander = Commander;
exports.getEnvPath = function() {};
exports.readZipManifest = readZipManifest;
exports.log = console.log;
exports.killAppByPid = killAppByPid;
exports.resolve = resolve;
exports.getFileAsDataURI = getFileAsDataURI;
exports.getJSON = getJSON;
exports.processEvents = processEvents;
exports.writeContent = writeContent;
exports.Q = Q;
exports.getLocaleBasedir = getLocaleBasedir;
exports.existsInAppDirs = existsInAppDirs;

