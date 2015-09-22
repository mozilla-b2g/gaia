'use strict';

var Promise = require('promise');
var assign = require('object-assign');
var fsPath = require('path');
var indent = require('indent-string');
var mozrunner = require('mozilla-runner');
var util = require('util');

var detectBinary = Promise.denodeify(mozrunner.detectBinary);

var DEFAULT_LOCATION = fsPath.join(process.cwd(), 'b2g');

function Session(host, id, options) {
  this.host = host;
  this.id = id;
  this.options = options;
}
module.exports = Session;

Session.prototype = {
  $rpc: { methods: ['destroy', 'checkError'] },

  checkError: function(profileConfig, err) {
    var request = {
      // TODO: This does not work for devices as is...
      dump_directory: profileConfig.profile + '/minidumps',
      symbols_path: this.options.symbols_path,
      dump_save_path: this.options.dump_path
    };

    return this.host.request('/get_crash_info', request)
    .then(function(info) {
      if (info.stackwalk_retcode !== 0) {
        return parseCrashInfoWithStackwalkError(info);
      }

      return parseCrashInfo(info);
    });
  },

  destroy: function() {
    return this.host.request('/stop_runner', { id : this.id })
    .then(function() {
      delete this.host.sessions[this.id];
      this.id = null;
    }.bind(this));
  }
};


Session.create = function(host, profile, options) {
  options = assign({ profile: profile, buildapp: 'desktop' }, options);
  if (options.b2g_home && options.buildapp === 'desktop') {
    return Promise.reject('Only specify --b2gpath for device or emulator');
  }
  if (!options.b2g_home && options.buildapp === 'emulator') {
    return Promise.reject('Must specify --b2gpath for emulator');
  }

  var startSession = resolveBinary(options)
  .then(function(binary) {
    return host.request('/start_runner', { binary: binary, options: options });
  })
  .then(function(result) {
    var session = new Session(host, result.id, options);
    host.sessions[result.id] = session;
    // Session no longer pending.
    host.pendingSessions.splice(host.pendingSessions.indexOf(startSession), 1);
    return session;
  });

  host.pendingSessions.push(startSession);
  return startSession;
};

/**
Figure out where the b2g-bin lives based on options.

@param {Object} options (as described by .help).
@return {Promise<Null|String>} null if none is needed or a path.
*/
function resolveBinary(options) {
  if (options.buildapp !== 'desktop') return Promise.resolve();
  if (options.runtime) return Promise.resolve(options.runtime);

  var binary = options.target || DEFAULT_LOCATION;
  return detectBinary(binary, { product: 'b2g' });
}

function parseCrashInfo(info) {
  var msg = util.format('Crash detected at: %s', info.signature);
  var error = new Error(msg);
  error.stack = msg + '\n' + info.stackwalk_stdout;
  error.name = 'ProcessCrash Stackwalk';
  return error;
}

function parseCrashInfoWithStackwalkError(info) {
  var msg = 'Crash detected but error running stackwalk\n';
  if (Array.isArray(info.stackwalk_errors)) {
    info.stackwalk_errors.forEach(function(err) {
      msg += indent(err, ' ', 2) + '\n';
    });
  }

  var error = new Error(msg);
  error.name = 'ProcessCrash';
  error.stack = msg +
                '\n' +
                indent((info.stackwalk_stderr || ''), ' ', 4);
  return error;
}
