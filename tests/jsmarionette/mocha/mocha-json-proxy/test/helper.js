'use strict';
var exec = require('child_process').exec,
    fork = require('child_process').fork,
    EE = require('events').EventEmitter,
    debug = require('debug')('mocha-json-proxy:test');


function forkFixture(test) {
  var reporterPath = __dirname + '/../reporter.js';
  var exec = __dirname + '/../../../../../node_modules/.bin/_mocha';
  var cmd = [
    '--reporter', reporterPath,
    '--ui', 'tdd',
    __dirname + '/fixtures/' + test
  ];

  var env = {};
  for (var key in process.env) {
    env[key] = process.env[key];
  }

  var runnerOpts = {
    env: env
  };

  // turn on the option to send messages directly between processes.
  runnerOpts.env[require(reporterPath).FORK_ENV] = true;

  return fork(exec, cmd, runnerOpts);
}

function runFixture(test, callback) {
  var cmd =
    __dirname + '/../../../../../node_modules/.bin/mocha' +
    ' --ui tdd --reporter ' + __dirname + '/../reporter ' +
    __dirname + '/fixtures/' + test;

  var emitter = new EE();
  exec(cmd, function(err, stdout, stderr) {
    debug('stdout', stdout);
    if (stderr) {
      console.error('ERR>>', stderr);
    }

    callback(null, emitter);

    var out = stdout.trim().split('\n');
    out.forEach(function(line) {
      var json;
      try {
        json = JSON.parse(line);
      } catch (e) {
        console.error(e);
      }
      emitter.emit.apply(emitter, json);
    });
    emitter.emit('helper end');
  });
}

global.assert = require('chai').assert;
global.runFixture = runFixture;
global.forkFixture = forkFixture;
