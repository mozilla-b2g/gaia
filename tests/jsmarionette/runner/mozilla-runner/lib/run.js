'use strict';
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

  if (options.noRemote !== false) {
    argv.push('-no-remote');
  }

  if (options.url) {
    argv.push(options.url);
  }

  if (options.oop) {
    argv.push('-oop');
  }

  if (options.chrome) {
    argv.push('-chrome');
    argv.push(options.chrome);
  }

  if (options.startDebugger) {
    argv.push('-start-debugger-server');
    argv.push(options.startDebugger);
  }

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
 *  - (Object) env: If present, specifies the exact environment to use.
 *  - (Object) envOverrides: Changes to make to the current environment; a value
 *    of null indicates that the key should be removed from the environment
 *    entirely.
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

  var spawnOpts = {
    cwd: undefined,
    env: process.env
  };

  if (options) {
    if (options.env) {
      spawnOpts.env = options.env;
    } else if (options.envOverrides) {
      spawnOpts.env = {};
      var envKey, envVal;
      for (envKey in process.env) {
        spawnOpts.env[envKey] = process.env[envKey];
      }
      for (envKey in options.envOverrides) {
        envVal = options.envOverrides[envKey];
        // Treat undefineds like null since this makes more sense than ending up
        // with the string 'undefined' in the environment.
        if (envVal == null) {
          delete spawnOpts.env[envKey];
        }
        else {
          spawnOpts.env[envKey] = envVal;
        }
      }
    }
  }


  // handler for creating process
  function spawnProduct(binPath) {
    var argv = buildArgv(options);
    debug('arv:', argv);
    debug('bin:', binPath);
    // spawn child process
    callback(null, spawn(binPath, argv, spawnOpts), binPath, argv);
  }

  function foundBinary(err, binPath) {
    if (err) return callback(err);
    debug('found bin', binPath);
    spawnProduct(binPath);
  }

  if (options && options.runtime &&
      fs.existsSync(options.runtime)) {
    foundBinary(null, options.runtime);
  } else {
    detectBinary(path, options, foundBinary);
  }
}

module.exports.run = run;
