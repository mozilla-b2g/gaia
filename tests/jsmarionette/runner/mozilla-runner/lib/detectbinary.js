'use strict';
var fs = require('fs'),
    fsPath = require('path');

module.exports.defaultBin = 'firefox-bin';

var platformPaths = {
  darwin: 'Contents/MacOS'
};

/**
 * Attempts to locate binary based on runtime/platform.
 *
 *    detectBinary(
 *      '/Applications/Firefox',
 *      { product: 'firefox' },
 *      function(err, firefox) {
 *          // firefox === '/Applications/Firefox/Contents/MacOS/firefox-bin'
 *      }
 *    );
 *
 * Options:
 *  - bin: "firefox-bin" by default
 *  - platform: defaults to process.platform
 *
 * @param {String} source of product runtime.
 * @param {Object} options for detection.
 * @param {Function} callback [err, binaryPath];
 */
function detectBinary(source, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  if (!options.product) throw new Error('.product must be given');

  var platform = options.platform || process.platform;
  var dir = platformPaths[platform] || '';

  var bins = [
    fsPath.join(source, dir, options.product + '-bin'),
    fsPath.join(source, dir, options.product)
  ];

  function exists(bin) {
    fs.exists(bin, function(itDoes) {
      if (itDoes) return callback(null, bin);
      next();
    });
  }

  function next() {
    var bin = bins.shift();
    if (!bin) {
      return callback(
        new Error('cannot find "' + options.product + '" binary in ' + source)
      );
    }

    exists(bin);
  }

  next();
}

module.exports.detectBinary = detectBinary;
