'use strict';
/**
 * This script scans the app directories and output them to GAIA_APPDIRS in
 * Makefile. Please note that we use utils.stdout to pass the result over.
 */

const utils = require('./utils');

var ScanAppdir = function() {
  var GAIA_APP_CONFIG = utils.getEnv('GAIA_APP_CONFIG');
  var GAIA_DIR = utils.getEnv('GAIA_DIR');
  var GAIA_DISTRIBUTION_DIR = utils.getEnv('GAIA_DISTRIBUTION_DIR');
  var GAIA_APP_SRCDIRS = utils.getEnv('GAIA_APP_SRCDIRS');
  var appListFile = utils.getFile(GAIA_APP_CONFIG);
  this.appList = utils.getFileContent(appListFile.exists() ?
    appListFile : utils.getFile(GAIA_APP_SRCDIRS));

  this.gaiaDirPath = GAIA_DIR;
  this.gaiaDistributionPath = GAIA_DISTRIBUTION_DIR;
  this.allAppList = [];
};

ScanAppdir.prototype.scanAppAndDistributionFolder = function(src, recursive) {
  var gaiaAppFolder = utils.getFile(this.gaiaDirPath, src);
  var distributionAppFolder;
  try {
    distributionAppFolder = utils.getFile(this.gaiaDistributionPath, src);
  } catch (e) {
    distributionAppFolder = null;
  }
  if (recursive) {
    utils.ls(distributionAppFolder, false, true).forEach(function(subFolder) {
      this.pushPathSrc(subFolder);
    }, this);
    utils.ls(gaiaAppFolder, false, true).forEach(function(subFolder) {
      this.pushPathSrc(subFolder);
    }, this);
  } else {
    if (!this.pushPathSrc(distributionAppFolder)) {
      if (!this.pushPathSrc(gaiaAppFolder)) {
        this.pushPathSrc(src);
      }
    }
  }
};

ScanAppdir.prototype.pushPathSrc = function(srcFolder, path) {
  try {
    if (!srcFolder.exists() || !srcFolder.isDirectory()) {
      return false;
    }
    var appFolder = path ? utils.getFile(srcFolder.path, path) : srcFolder;
    if (appFolder.exists() && appFolder.isDirectory()) {
      this.allAppList.push(appFolder.path);
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
};

ScanAppdir.prototype.execute = function() {
  var baseSrc;
  this.appList.split('\n').forEach(function(src) {
    src = src.trim();
    if (!src || src === '') {
      return;
    }
    if (src[src.length - 1] === '*') {
      baseSrc = src.slice(0, src.length - 2);
      this.scanAppAndDistributionFolder(baseSrc, true);
    } else {
      this.scanAppAndDistributionFolder(src, false);
    }
  }, this);
};

function execute() {
  var appList;
  var scanAppDir = new ScanAppdir();
  scanAppDir.execute();
  appList = scanAppDir.allAppList.join(' ');
  utils.stdout((utils.getOsType().indexOf('WIN') !== -1) ?
    appList.replace(/\\/g, '\\\\') : appList);
}

exports.execute = execute;
