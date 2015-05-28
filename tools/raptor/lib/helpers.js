var fs = require('fs');

var helpers = {};

/**
 * Read any file as JSON. Unfortunately require can't read a file as JSON unless
 * it has a .json extension, so this will simulate using require.
 * @param {string} path
 * @returns {*}
 */
helpers.requireJSON = function(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
};

module.exports = helpers;
