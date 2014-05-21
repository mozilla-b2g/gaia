/* global require, exports */
'use strict';

const utils = require('utils');

// list all directory in dirs and join them to an array.
function listDirs(dirs) {
  var files = [];
  dirs.forEach(function(dir) {
    if (dir.exists()) {
      files.push.apply(files, utils.ls(dir, false));
    }
  });
  files = files.filter(function(file) {
    return file.isDirectory();
  });
  return files;
}

// push to |dirs| if dir is a directory and exists.
function pushDirs(dirs, dir) {
  if (dir.exists() && dir.isDirectory()) {
    dirs.push(dir);
  }
}

exports.execute = function(options) {
  var appsList;
  var paths = [];
  var appConfig = utils.getFileContent(utils.getFile(options.GAIA_APP_CONFIG));

  // base dirs to search apps, currently we use gaiaDir and distributionDir
  // if exists.
  var basedirs = [];
  [options.GAIA_DIR, options.GAIA_DISTRIBUTION_DIR].forEach(function(dir) {
    try {
      var dirFile = utils.getFile(dir);
      if (dirFile.exists()) {
        basedirs.push(dirFile);
      }
    } catch (e) {
      // skip this dir if it does not exist.
    }
  });

  var appDirs = [];
  appConfig.split('\n').forEach(function(line) {
    // clone each directory for appending sub-path later.
    // candidateAppDirs = [GAIA_DIR, DIST_DIR]
    var candidateAppDirs = basedirs.map(function(dir) {
      return dir.clone();
    });

    // skip line if it's empty
    line = line.trim();
    if (!line) {
      return;
    }

    // split line to parts by slash then append it to candidateAppDirs
    line.split('/').forEach(function(part, i, arr) {
      if (part === '*') {
        // for example "apps/*", use listDirs to list all dirs in apps/ and push
        // them to appDirs
        appDirs.push.apply(appDirs, listDirs(candidateAppDirs));
        return;
      } else {
        // if the first part is "apps", then candidateAppDirs chagnes
        // from [GAIA_DIR, DIST_DIR]
        // to   [GAIA_DIR/apps, DIST_DIR/apps]
        candidateAppDirs.forEach(function(dir) {
          dir.append(part);
        });
      }

      if (i === arr.length - 1 && part !== '*') {
        // if it is last part of path and it's not *
        // append it into candidateAppDirs and check if it exists
        // e.g. "dev_apps/template"
        // candidateAppDirs = [GAIA_DIR/dev_apps/template,
        //   DIST_DIR/dev_apps/template]
        // pushDirs() only push existing dir into appDirs.
        candidateAppDirs.forEach(function(dir) {
          pushDirs(appDirs, dir);
        });
      }
    });
  });

  paths = appDirs.map(function(dir) {
    return dir.path;
  });

  utils.ensureFolderExists(utils.getFile(options.STAGE_DIR));
  appsList = utils.getFile(options.STAGE_APPS_LIST);
  utils.writeContent(appsList, paths.join('\n'));
};
