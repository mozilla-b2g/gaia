'use strict';

var EventEmitter = require('events').EventEmitter;
var Promise = require('promise');
var debug = require('debug')('host/host');
var request = require('./lib/request');
var spawn = require('child_process').spawn;
var uuid = require('uuid');
var _ = require('lodash');

var VENV = 'VIRTUALENV_PATH' in process.env ?
  process.env.VIRTUALENV_PATH :
  __dirname + '/../venv';

function Host(socketPath, process, log) {
  debug('Created new host', socketPath);
  this.socketPath = socketPath;
  this.process = process;
  this.log = log;
  this.sessions = {};
  this.pendingSessions = [];
  this.error = null;

  this.onerror = this.onerror.bind(this);
  this.onexit = this.onexit.bind(this);
  this.process.on('error', this.onerror);
  this.process.on('exit', this.onexit);

  EventEmitter.call(this);
}
module.exports = Host;

Host.prototype = {
  __proto__: EventEmitter.prototype,

  destroy: function() {
    // If there are any pending session creates wait for those to cleanly finish
    // first.
    if (this.pendingSessions.length) {
      return Promise.all(this.pendingSessions).then(this.destroy.bind(this));
    }

    Promise.all(
      _.map(this.sessions, function(session) {
        return session.destroy();
      })
    );

    return Promise.all(
      _.map(this.sessions, function(session) {
        return session.destroy();
      })
    )
    .then(function() {
      if (Object.keys(this.sessions).length !== 0) {
        return Promise.reject(new Error('Not all sessions were deleted'));
      }

      var proc = this.process;
      proc.removeListener('exit', this.onexit);
      return new Promise(function(accept, reject) {
        proc.once('exit', function() {
          proc.removeListener('error', this.onerror);
          if (this.error) return reject(this.error);
          accept();
        }.bind(this));

        proc.kill();
      }.bind(this));
    }.bind(this));
  },

  /**
  Issue a request to the hosts underlying python http server.
  */
  request: function(path, options) {
    if (this.error) return Promise.reject(this.error);
    return request(this.socketPath, path, options);
  },

  onerror: function(error) {
    debug('Python process error', error.toString());
    this.error = error;
    this.process.removeListener('exit', this.onexit);
    this.process.kill();
  },

  onexit: function(exit) {
    debug('Python process exited unexpectedly', JSON.stringify(exit));
    this.error = new Error('Python unexpected exit ' + JSON.stringify(exit));
    this.process.removeListener('exit', this.onexit);
  }
};

Host.create = function() {
  var socketPath = '/tmp/marionette-socket-host-' + uuid.v1() + '.sock';
  var pythonChild = spawnVirtualEnv(
    'gaia-integration',
    ['--path=' + socketPath],
    { stdio: [0, 1, 'pipe', 'pipe'] }  // Swallow python stderr
  );

  var failOnChildError = new Promise(function(accept, reject) {
    function onError(error) {
      debug('Python process error during initial connect', error.toString());
      reject(error);
    }

    pythonChild.once('error', onError);
    pythonChild.once('exit', function(exit) {
      // Ensure we don't call error callback somehow...
      pythonChild.removeListener('error', onError);
      reject(new Error(
        'Unexpected exit during connect: ' +
        'signal = ' + exit.signal + ', ' +
        'code = ' + exit.code
      ));
    });
  });

  var connect = request(socketPath, '/connect').then(function() {
    pythonChild.removeAllListeners('error');
    pythonChild.removeAllListeners('exit');
    return new Host(socketPath, pythonChild, pythonChild.stdio[3]);
  });

  return Promise.race([connect, failOnChildError]);
};

/**
Wrapper for spawning a python process which expects a venv with particular
packages. Same interface as spawn but overrides path and ensures certain env
variables are not set which conflict.

@param {String} bin path to binary to execute.
@param {Array} argv list of arguments.
@param {Object} opts options for node's spawn.
@return {ChildProcess}
*/
function spawnVirtualEnv(bin, argv, opts) {
  opts = opts || {};
  // Clone current environment variables...
  var env = {};
  _.assign(env, process.env);
  opts.env = env;

  // Prepend binary wrappers to path.
  env.PATH = VENV + '/bin/:' + process.env.PATH;

  // Ensure we don't conflict with other wrappers or package managers.
  delete env.PYTHONHOME;

  return spawn(bin, argv, opts);
}
