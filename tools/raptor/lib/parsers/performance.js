var Parser = require('./parser');
var TOKEN = 'PerformanceTiming';
var OLD_TOKEN = 'Performance Entry: ';

/**
 * Determine whether a log entry is one for performance marks and measures
 * @param {object} item ADB log entry
 * @returns {boolean}
 */
var matcher = function(item) {
  return item.tag === TOKEN;
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
 *   pid: String
 * }}
 */
var parser = function(item) {
  var parts = item.message
    .replace(OLD_TOKEN, '')
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
