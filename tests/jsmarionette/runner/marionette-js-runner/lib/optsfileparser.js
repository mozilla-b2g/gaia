'use strict';
var debug = require('debug')('marionette-js-runner:optsfile'),
    fs = require('fs');

/**
 * Reads the contents of given opts file and returns an array.
 *
 * @param {String} file to load opts from.
 * @return {Array} options.
 */
function loadOptsFile(file) {
  debug('loading opts file', file);
  var opts = fs.readFileSync(file, 'utf8')
    .trim()
    .split(/\s+/);

  return opts;
}

module.exports = loadOptsFile;
