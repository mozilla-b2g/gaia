var Parser = require('./parser');
var TOKEN = 'App Grid Item: ';

/**
 * Determine whether a log entry is one for Homescreen grid items
 * @param {object} item ADB log entry
 * @returns {boolean}
 */
var matcher = function(item) {
  return item.message.indexOf(TOKEN) !== -1;
};

/**
 * Parse an ADB log entry and extract the Homescreen grid item's URL, possible
 * entry point, and its X and Y coordinates
 * @param {object} item ADB log entry
 * @returns {{url: String, entryPoint: String, x: Number, y: Number}}
 */
var parser = function(item) {
  var index = item.message.indexOf(TOKEN) + TOKEN.length;
  var parts = item.message
    .substr(index)
    .split('|');

  return {
    url: parts[0],
    entryPoint: parts[1],
    x: parseFloat(parts[2]),
    y: parseFloat(parts[3])
  };
};


module.exports = Parser('griditem', matcher, parser);
