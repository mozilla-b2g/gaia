/**
 * Helper class used to define
 * cli sub commands for b2g-scripts.
 *
 *
 * ````
 * var Script = require('../lib/script');
 * module.exports = new Script({
 *   desc: 'desc',
 *   usage: 'desc [arg]',
 *   options: {
 *     'path': { default: process.cwd() }
 *   }
 * }, function(argv) {
 *   argv.path
 *   //....
 * })
 * ````
 *
 *
 * @param {Object} options options for script handler.
 * @param {Function} fn function used when .run is called.
 */
function Script(options, fn) {

  if (!(this instanceof Script)) {
    return new Script(options, fn);
  }

  this.desc = options.desc || '';
  this.usage = options.usage || '';
  this.options = options.options || {};
  this.opt = null;

  this.run = function runScript() {
    var key, value;
    var opt = require('optimist').
        usage('USAGE: b2g-scripts ' + this.usage + '\n\n' + this.desc),
        argv;

    for (key in this.options) {
      opt.option(key, this.options[key]);
    }

    argv = opt.argv;

    if (argv.help) {
      opt.showHelp();
      process.exit(0);
    }

    this.opt = opt;

    fn.call(this, argv, opt);
  };
}

Script.prototype = {

  help: function(exit) {
    this.opt.showHelp();
    process.exit(exit || 0);
  }

};

module.exports = Script;
