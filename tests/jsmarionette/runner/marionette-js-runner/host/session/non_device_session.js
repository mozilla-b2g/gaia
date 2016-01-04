'use strict';
let Session = require('./session');
let debug = require('debug')('host/session/NonDeviceSession');
let denodeify = require('promise').denodeify;
let detectBinary = denodeify(require('mozilla-runner').detectBinary);
let indent = require('indent-string');
let inherits = require('util').inherits;

const DEFAULT_BINARY_LOCATION = `${process.cwd()}/firefox`;

/**
 * @constructor
 */
function NonDeviceSession() {
  Session.apply(this, arguments);
}

inherits(NonDeviceSession, Session);

/**
 * @return {Promise<void>}
 */
NonDeviceSession.prototype.start = function() {
  let host = this.host;
  let options = this.options;
  if (options.buildapp === 'emulator' && !options.b2g_home) {
    return Promise.reject(new Error('Must specify --b2gpath for emulator'));
  }

  let resolveBinary;
  if (options.buildapp !== 'desktop') {
    resolveBinary = Promise.resolve();
  } else if (options.runtime) {
    resolveBinary = Promise.resolve(options.runtime);
  } else {
    resolveBinary = detectBinary(
      options.target || DEFAULT_BINARY_LOCATION,
      {product: 'firefox'}
    );
  }

  let startSession = resolveBinary
  .then(binary => {
    debug('Will use firefox binary', binary);
    return host.request('/start_runner', {binary, options});
  })
  .then(result => {
    let id = result.id;
    debug('Started new python service session', id);
    this.id = id;
    host.sessions[id] = this;
    host.pendingSessions.splice(host.pendingSessions.indexOf(startSession), 1);
  });

  host.pendingSessions.push(startSession);
  return startSession;
};

/**
 * @return {Promise<void>}
 */
NonDeviceSession.prototype.destroy = function() {
  let host = this.host;
  let id = this.id;
  return host.request('/stop_runner', {id}).then(() => {
    delete host.sessions[id];
    this.id = null;
  });
};

/**
 * @return {Promise<Error>}
 */
NonDeviceSession.prototype.checkError = function(profileConfig, err) {
  let details = {
    dump_directory: `${profileConfig.profile}/minidumps`,
    symbols_path: this.options.sybmols_path,
    dump_save_path: this.options.dump_path
  };

  return this.host.request('/get_crash_info', details).then(info => {
    if (Object.keys(info).length === 0) {
      // if info is empty, we didn't crash the process and this is a js error.
      return err;
    }

    let parse = info.stackwalk_retcode === 0 ?
      parseCrashInfo :
      parseCrashInfoWithStackwalkError;


    return parse(info);
  });
};

/**
 * @param {Object} info crash info.
 */
function parseCrashInfo(info) {
  let msg = `Crash detected at: ${info.signature}`;
  let error = new Error(msg);
  error.stack = `${msg}\n${info.stackwalk_stdout}`;
  error.name = 'ProcessCrash';
  return error;
}

/**
 * @param {Object} info crash info.
 */
function parseCrashInfoWithStackwalkError(info) {
  let msg = 'Crash detected but error running stackwalk';
  if (Array.isArray(info.stackwalk_errors)) {
    info.stackwalk_errors.forEach(err => {
      msg += `${indent(err, ' ', 2)}\n`;
    });
  }

  let error = new Error(msg);
  error.name = 'ProcessCrashStackwalkError';
  return error;
}

module.exports = NonDeviceSession;
