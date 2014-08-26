'use strict';

/* global require, exports */

var utils = require('utils');
var fsPath = require('sdk/fs/path');
var config = require('config/build-config.json');

function getTimestamp(dirPaths) {
  let timestamp = {};

  dirPaths.forEach(function(dirPath) {
    timestamp[dirPath] = {};
    let dir = utils.getFile(dirPath);
    if (dir.exists() && dir.isDirectory()) {
      utils.ls(dir, true).filter(filterFiles).forEach(function(file) {
        let relativePath = fsPath.relative(dir.path, file.path);
        timestamp[dirPath][relativePath] = file.lastModifiedTime;
      });
    }
  });
  return timestamp;
}

function filterFiles(file) {
  let path = file.path;
  let ignores = ['.gitignore', '.jshintrc'];
  let result = true;

  config.blacklist.forEach(function(pattern) {
    ignores.push(pattern);
  });

  ignores.forEach(function(pattern) {
    if (path.indexOf(pattern) !== -1) {
      result = false;
      return;
    }
  });
  return result;
}

function dirChanged(previous, current, dir) {
  for (let filepath in current) {
    if (current[filepath] > previous[filepath] || !previous[filepath]) {
      utils.log('rebuild', 'file has been changed: ' + dir + '/' + filepath);
      return true;
    }
  }
  return false;
}

exports.execute = function(options) {
  var scanningDirs = options.GAIA_APPDIRS.split(' ');
  var sharedPath = utils.getFile(options.GAIA_DIR, 'shared').path;
  scanningDirs.push(sharedPath);
  var current = getTimestamp(scanningDirs);
  var timestampFile = utils.getFile(options.STAGE_DIR, 'timestamp.json');
  var rebuildAppDirs = [];

  if (timestampFile.exists()) {
    let previous = utils.getJSON(timestampFile);
    let sharedChanged =
      dirChanged(previous[sharedPath], current[sharedPath], sharedPath);

    // If shared directory has been changed, we rebuild all apps.
    if (sharedChanged) {
      rebuildAppDirs = scanningDirs;
    }
    // Else we rebuild apps which are changed.
    else {
      for (let appDir in current) {
        if (dirChanged(previous[appDir], current[appDir], appDir)) {
          rebuildAppDirs.push(appDir);
        }
      }
      for (let appDir in previous) {
        if (!current[appDir]) {
          rebuildAppDirs.push(appDir);
        }
      }
    }
  } else {
    rebuildAppDirs = scanningDirs;
  }
  utils.writeContent(timestampFile, JSON.stringify(current, null, 2));
  utils.log('rebuild', 'rebuildAppDirs: ' + JSON.stringify(rebuildAppDirs));
  return rebuildAppDirs;
};

exports.getTimestamp = getTimestamp;
exports.filterFiles = filterFiles;
exports.dirChanged = dirChanged;
