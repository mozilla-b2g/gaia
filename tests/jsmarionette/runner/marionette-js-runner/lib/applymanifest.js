'use strict';
var fs = require('fs'),
    path = require('path'),
    difference = require('array-difference'),
    intersect = require('intersect');

function resolvePath(pathStr) {
  return path.resolve(pathStr);
}

/**
 *  Defensively resolve arguments to absolute paths (in order to avoid
 * "resolving" arguments that do not actually reference files)
 *
 * @private
 * @param {String} argument from the command-line.
 * @return {String}
 */
function defensiveResolvePath(argument) {
  var resolved = resolvePath(argument);

  if (fs.existsSync(resolved)) {
    return resolved;
  }

  return argument;
}

/**
 * Transform the input command-line arguments according to the directives found
 * in the specified manifest file.
 *
 * @param {Object} manifest referencing the manifest file.
 * @param {Array} files to filter.
 * @return {Array} filtered files.
 */
function applyManifest(manifest, files) {
  var fullPaths = files.map(resolvePath);

  var withoutFiles;
  if (manifest.whitelist) {
    manifest.whitelist = manifest.whitelist.map(resolvePath);
    // Select all file names that have not been specified
    withoutFiles = difference(fullPaths, manifest.whitelist);
  } else if (manifest.blacklist) {
    var blacklist = manifest.blacklist;
    if (!Array.isArray(blacklist)) {
      blacklist = Object.keys(blacklist);
    }
    blacklist = blacklist.map(resolvePath);
    // Select only the file names that have been specified
    withoutFiles = intersect(fullPaths, blacklist);
  }

  fullPaths = fullPaths.map(defensiveResolvePath);

  // Remove the appropriate file arguments from the list
  return difference(withoutFiles, fullPaths);
}

module.exports = applyManifest;
