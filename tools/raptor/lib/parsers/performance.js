var Parser = require('./parser');
var TOKEN = 'Performance Entry: ';

/**
 * Determine whether a log entry is one for performance marks and measures
 * @param {object} item ADB log entry
 * @returns {boolean}
 */
var matcher = function(item) {
  return item.message.indexOf(TOKEN) !== -1;
};

/**
 * Parse an ADB log entry and extract the performance metadata
 * @param {object} item ADB log entry
 * @returns {{
 *   entryType: String,
 *   name: String,
 *   context: String,
 *   startTime: Number,
 *   duration: Number,
 *   epoch: Number,
 *   pid: Number
 * }}
 */
var parser = function(item) {
  var index = item.message.indexOf(TOKEN) + TOKEN.length;
  var parts = item.message
    .substr(index)
    .split('|');
  var name = parts[2].split('@');

  return {
    context: name[1] || parts[0],
    entryType: parts[1],
    name: name[0],
    startTime: parseFloat(parts[3]),
    duration: parseFloat(parts[4]),
    epoch: parseFloat(parts[5]),
    pid: item.pid
  };
};

module.exports = Parser('performanceentry', matcher, parser);
