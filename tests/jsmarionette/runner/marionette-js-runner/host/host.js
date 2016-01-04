'use strict';
let PassThrough = require('stream').PassThrough;
let debug = require('debug')('host/Host');
let denodeify = require('promise').denodeify;
let emptyPort = denodeify(require('empty-port'));
let eventToPromise = require('event-to-promise');
let map = require('lodash/collection/map');
let request = require('./lib/request');
let spawn = require('child_process').spawn;
let uuid = require('uuid').v1;
let waitUntilUsed = require('tcp-port-used').waitUntilUsed;

const VENV = 'VIRTUALENV_PATH' in process.env ?
  process.env.VIRTUALENV_PATH :
  `${__dirname}/../venv`;

/**
 * @constructor
 */
function Host() {
  this.log = new PassThrough();
  this.sessions = {};
  this.pendingSessions = [];
}

/**
 * @type {object<string, Session>}
 */
Host.prototype.sessions = null;

/**
 * @type {Array<Promise<Session>>}
 */
Host.prototype.pendingSessions = null;

/**
 * @type {object}
 */
Host.prototype._deviceService = null;

/**
 * @type {object}
 */
Host.prototype._mozRunner = null;

/**
 * For historical reasons (and for the time being) we use a python service
 * to run tests on mulet and emulators. For devices, we use
 * fxos-device-service. We want to spawn servers here to handle either
 * environment. This should go away once bug 1227580 is resolved.
 *
 * @return {Promise<void>}
 */
Host.prototype.start = function() {
  debug('Will bring up host');
  return Promise.all([
    createDeviceService(),
    createMozRunner()
  ])
  .then(result => {
    let deviceService = result[0];
    let mozRunner = result[1];
    this._deviceService = deviceService;
    this._mozRunner = mozRunner;
    mozRunner.log.pipe(this.log);
  });
};

/**
 * @return {Promise<void>}
 */
Host.prototype.destroy = function() {
  // If there are any sessions being created, wait for those to cleanly
  // finish first.
  if (this.pendingSessions.length) {
    return Promise.all(this.pendingSessions).then(() => this.destroy());
  }

  return Promise.all(map(this.sessions, session => session.destroy()))
  .then(() => {
    if (Object.keys(this.sessions.length)) {
      return Promise.reject(new Error('Not all sessions were deleted!'));
    }

    this.sessions = null;
    this.pendingSessions = null;

    return Promise.all(
      [this._deviceService, this._mozRunner].map(handle => {
        let proc = handle.proc;
        proc.kill();
        return eventToPromise(proc, 'exit');
      })
    );
  });
};

/**
 * @return {Promise<object>}
 */
Host.prototype.request = function(path, options) {
  debug('request', path, JSON.stringify(options));
  return request(this._mozRunner.socketPath, path, options);
};

/**
 * @return {Promise<ChildProcess>}
 */
function createDeviceService() {
  let proc, port;
  return emptyPort({startPort: 60030})
  .then(result => {
    port = result;
    let stdio = getStdio();
    let env = Object.assign(process.env);
    // Add node_modules/.bin/ to $PATH
    env.PATH = `${__dirname}/../node_modules/.bin/:${env.PATH}`;
    proc = spawn('fxos-device-service', [port], {env, stdio});
    return Promise.race([
      waitUntilUsed(port),
      rejectOnProcessCrash(proc)
    ]);
  })
  .then(() => {
    debug('Device service running on port', port);
    return {process: proc, port};
  });
}

/**
 * @return {Promise<object>}
 */
function createMozRunner() {
  let runner = spawnMozRunner();
  return Promise.race([
    connectToMozRunner(runner),
    rejectOnProcessCrash(runner.process)
  ]);
}

/**
 * @return {object}
 */
function spawnMozRunner() {
  let socketPath = `/tmp/marionette-socket-host-${uuid()}.sock`;
  let env = Object.assign(process.env);
  // Prepend binary wrappers to path.
  env.PATH = `${VENV}/bin/:${env.PATH}`;
  // Ensure we don't conflict with other wrappers or package managers.
  delete env.PYTHONHOME;
  let stdio = getStdio();
  let proc = spawn(
    'gaia-integration',
    [`--path=${socketPath}`],
    {env, stdio}
  );

  return {process: proc, socketPath, log: proc.stdio[3]};
}

/**
 * @param {object} runner mozrunner process details.
 * @return {Promise<object>}
 */
function connectToMozRunner(runner) {
  return request(runner.socketPath, '/connect').then(() => {
    debug('Connected to mozrunner on', runner.socketPath);
    runner.process.removeAllListeners('error');
    runner.process.removeAllListeners('exit');
    return runner;
  });
}

/**
 * @param {ChildProcess} proc.
 * @return {Promise<void}>
 */
function rejectOnProcessCrash(proc) {
  return new Promise((resolve, reject) => {
    function handleExit(exit) {
      proc.removeListener('error', reject);
      reject(new Error(`process unexpected exit ${JSON.stringify(exit)}`));
    }

    proc.once('error', reject);
    proc.once('exit', handleExit);
  });
}

/**
 * @return {Array<number|string>}
 */
function getStdio() {
  return isDebugMode() ? [0, 1, 2, 'pipe'] : ['pipe', 'pipe', 'pipe', 'pipe'];
}

/**
 * @return {boolean}
 */
function isDebugMode() {
  return ['DEBUG', 'NODE_DEBUG'].some(flag => !!flag);
}

module.exports = Host;
