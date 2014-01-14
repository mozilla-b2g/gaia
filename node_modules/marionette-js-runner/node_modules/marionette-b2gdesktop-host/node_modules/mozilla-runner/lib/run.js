var detectBinary = require('./detectbinary').detectBinary,
    debug = require('debug')('mozilla-runner:run'),
    spawn = require('child_process').spawn,
    fs = require('fs');

// private helper for building the argv
function buildArgv(options) {
  var argv = [];

  if (options.argv)
    argv = argv.concat(options.argv);

  if (options.profile) {
    argv.push('-profile');
    argv.push(options.profile);
  }

  if (options.screen &&
      options.screen.width &&
      options.screen.height) {

    argv.push('--screen=' +
      options.screen.width + 'x' +
      options.screen.height + (
        options.screen.dpi ?
          ('@' + options.screen.dpi) :
          ''));
  }

  if (options.noRemote !== false)
    argv.push('-no-remote');

  if (options.url)
    argv.push(options.url);

  return argv;
}

/**
 * Run an instance of a mozilla runtime/product.
 *
 * Options:
 *  - (Boolean) noRemote: defaults to true (-no-remote flag)
 *  - (String) url: url to navigate to
 *  - (String) profile: path to gecko profile
 *  - (Array) argv: additional arguments to pass to process
 *
 *  var options = {}
 *  mozrun(path, options, function(err, child, binary, argv) {
 *
 *  });
 */
function run(path, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = null;
  }

  // handler for creating process
  function spawnProduct(binPath) {
    var argv = buildArgv(options);
    debug('arv:', argv);
    debug('bin:', binPath);
    // spawn child process
    callback(null, spawn(binPath, argv), binPath, argv);
  }

  function foundBinary(err, binPath) {
    if (err) return callback(err);
    debug('found bin', binPath);
    spawnProduct(binPath);
  }

  detectBinary(path, options, foundBinary);
}

module.exports.run = run;
