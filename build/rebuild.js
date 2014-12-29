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
      utils.ls(dir, true).filter(isFileWatched).forEach(function(file) {
        let relativePath = fsPath.relative(dir.path, file.path);
        timestamp[dirPath][relativePath] = file.lastModifiedTime;
      });
    }
  });
  return timestamp;
}

function isFileWatched(file) {
  let path = file.path;
  let ignores = [];
  let result = true;

  // Ignore all hidden files (ex: .filename)
  if (/^\.\S+|\/\.\S+$/.test(path)) {
    return false;
  }

  config.rebuildBlacklist.forEach(function(pattern) {
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
    if (!previous[filepath] || current[filepath] > previous[filepath]) {
      utils.log('rebuild', 'file has been changed: ' + dir + '/' + filepath);
      return true;
    }
  }
  return false;
}

function buildConfigChanged(previous, current) {
  if (current.REBUILD == 1) {
    utils.log('rebuild', 'rebuild forced by use of special env like' +
      'LOCALE_BASEDIR, GAIA_DISTRIBUTION_DIR or REBUILD');
    return true;
  }

  let flags = [];

  // We don't detect FLAGS in blacklist because we don't have to rebuild again
  // if someone specifies them.
  let blacklist = ['REBUILD', 'P', 'VERBOSE'];

  for (let flag in current) {
    if (blacklist.indexOf(flag) === -1 && current[flag] !== previous[flag]) {
      flags.push(flag);
    }
  }

  if (flags.length > 0) {
    utils.log('rebuild', 'build config has been changed: ' + flags.join(', '));
  }

  return flags.length > 0;
}

exports.execute = function(options) {
  var scanningDirs = options.GAIA_APPDIRS.split(' ');
  var sharedPath = utils.getFile(options.GAIA_DIR, 'shared').path;
  scanningDirs.push(sharedPath);
  var current = getTimestamp(scanningDirs);
  var timestampFile = utils.getFile(options.STAGE_DIR, 'timestamp.json');
  var rebuildAppDirs = [];

  if (timestampFile.exists()) {
    let record = utils.getJSON(timestampFile);
    let previous = record.timestamp;
    let sharedChanged =
      dirChanged(previous[sharedPath] || {}, current[sharedPath], sharedPath);
    let configChanged =
      buildConfigChanged(record.build_config, options);

    // Rebuild everything if any BUILD_CONFIG attribute changed or if any
    // shared/ file changed
    if (configChanged || sharedChanged) {
      rebuildAppDirs = scanningDirs;
    }
    // Rebuild any app that has any of its source file modified or external app
    else {
      for (let appDir in current) {
        if (dirChanged(previous[appDir] || {}, current[appDir], appDir)) {
          rebuildAppDirs.push(appDir);
        }
      }

      // Force rebuilding all apps with custom build.js file or unpakcage
      // external apps which are always named by random uuid
      // These uuid apps may clean up later in bug 1020259
      scanningDirs.forEach(function(appDir) {
        if (rebuildAppDirs.indexOf(appDir) !== -1 || appDir === sharedPath) {
          return;
        }
        var buildFile = utils.getFile(appDir, 'build', 'build.js');
        var webapp = utils.getWebapp(appDir, options);
        if (!webapp) {
          // Some leftover folders may still be in source tree,
          // without any valid app, like apps/browser that has been removed.
          return;
        }

        if (buildFile.exists() ||
            (utils.isExternalApp(webapp) && !webapp.pckManifest) ||
            !webapp.profileDirectoryFile.exists()) {
          rebuildAppDirs.push(appDir);
        }
      });
    }
  } else {
    rebuildAppDirs = scanningDirs;
  }

  utils.writeContent(timestampFile, JSON.stringify({
    build_config: options,
    timestamp: current
  }, null, 2));

  utils.log('rebuild', 'rebuildAppDirs: ' + JSON.stringify(rebuildAppDirs));
  return rebuildAppDirs;
};

exports.getTimestamp = getTimestamp;
exports.isFileWatched = isFileWatched;
exports.dirChanged = dirChanged;
exports.buildConfigChanged = buildConfigChanged;
