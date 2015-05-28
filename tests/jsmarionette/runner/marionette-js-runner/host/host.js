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
  this.restarting = Promise.resolve();
  this.isRequestInProgress = false;
  this.didCrashDuringRequest = false;
  this.onerror = this.onerror.bind(this);
  this.onexit = this.onexit.bind(this);

  process.on('error', this.onerror);
  process.on('exit', this.onexit);

  var restart = this.restart;
  process.stdout.on('data', function(chunk) {
    if (chunk.toString().indexOf('Exception') !== -1) {
      restart();
    }
  });

  process.stderr.on('data', function(chunk) {
    if (chunk.toString().indexOf('error') !== -1) {
      restart();
    }
  });

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

  restart: function() {
    // Python died so let's restart! Yay! Long live python.
    console.log('Python crashed! Will restart service...');
    if (this.isRequestInProgress) {
      console.log('There was a request in progress!');
      this.didCrashDuringRequest = true;
    }

    this.restarting = new Promise(function(resolve) {
      // Kill ourselves.
      this.process.removeListener('error', this.onerror);
      this.process.removeListener('exit', this.onexit);

      if (!this.process.connected) {
        return resolve();
      }

      this.process.on('exit', resolve);
      this.process.kill();
    }.bind(this))
    .then(function() {
      // Start a new python child.
      return spawnPythonChild();
    })
    .then(function(details) {
      this.socketPath = details.socketPath;
      this.process = details.process;
      this.log = details.log;
      this.process.on('error', this.onerror);
      this.process.on('exit', this.onexit);
    }.bind(this));
  },

  /**
  Issue a request to the hosts underlying python http server.
  */
  request: function(path, options) {
    if (this.error) return Promise.reject(this.error);
    return this.restarting.then(function() {
      this.isRequestInProgress = true;
      return request(this.socketPath, path, options);
    }.bind(this))
    .catch(function() {})  // TODO(gaye): Replace with finally
    .then(function(result) {
      this.isRequestInProgress = false;
      if (this.didCrashDuringRequest) {
        console.log('Will retry ' + path + ' request...');
        this.didCrashDuringRequest = false;
        return this.request(path, options);
      }

      return result;
    }.bind(this));
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
  return spawnPythonChild().then(function(details) {
    return new Host(details.socketPath, details.process, details.log);
  });
};

function spawnPythonChild() {
  var socketPath = '/tmp/marionette-socket-host-' + uuid.v1() + '.sock';
  var pythonChild = spawnVirtualEnv(
    'gaia-integration',
    ['--path=' + socketPath],
    { stdio: ['pipe', 'pipe', 'pipe', 'pipe'] }  // Swallow python stderr
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
    return {
      socketPath: socketPath,
      process: pythonChild,
      log: pythonChild.stdio[3]
    };
  });

  return Promise.race([connect, failOnChildError]);
}

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
