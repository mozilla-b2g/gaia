var fs = require('fs');
var runners = {
  'cold': 'cold-launch',
  'reboot': 'reboot',
  'restart-b2g': 'restart-b2g',
  'first-time': 'first-time-launch'
};

/**
 * Factory to instantiate a suite runner based on the phase type, e.g. `cold`,
 * `reboot`, `first`, `restart-b2g`
 * @param {{
 *   phase: String
 * }} options
 * @returns {Runner}
 * @constructor
 */
var Suite = function(options) {
  // Name is actually (a part of) path.
  var name = runners[options.phase];
  var path = name;
  if (!fs.existsSync(path)) {
    // If it's not a valid path, try to search it in default ones.
    path = './' + path;
  }
  var Runner = require(path);
  var runner = new Runner(options);

  return runner;
};

/**
 * Register a customized runner.
 * @param {string} phase the phase name of the customized runner
 * @param {path} path the path to the runner file
 */
Suite.registerRunner = function(phase, path) {
  runners[phase] = path;
};

module.exports = Suite;
