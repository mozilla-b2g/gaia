var Parser = require('./parser');
var TOKEN = 'PerformanceMemory';

/**
 * Determine whether a log entry is one for an application's memory entry
 * @param {object} item ADB log entry
 * @returns {boolean}
 */
var matcher = function(item) {
  return item.tag === TOKEN;
};

/**
 * Parse an ADB log entry and extract an application's memory entry
 * @param {object} item ADB log entry
 * @returns {{context: String, name: String, value: Number, entryType: String}}
 */
var parser = function(item) {
  var parts = item.message.split('|');

  return {
    context: parts[0],
    name: parts[1],
    value: parseFloat(parts[2]) * 1024 * 1024,
    entryType: 'memory'
  };
};

module.exports = Parser('memoryentry', matcher, parser);
