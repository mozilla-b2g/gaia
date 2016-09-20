'use strict';
let Host = require('./host');

exports.help = {
  group: {
    title: 'Socket Host',
    description: 'Socket host uses mozbase to manage gecko applications.'
  },
  arguments: {
    '--serial': {
      dest: 'device_serial',
      defaultValue: null,
      help: 'Serial port (only with buildapp=device)',
      type: 'string'
    },

    '--symbols-path': {
      dest: 'symbols_path',
      help: 'Path to build symbols used by crash reporting.',
      defaultValue: null,
      type: 'string'
    },

    '--b2gpath': {
      dest: 'b2g_home',
      help: 'Path to b2g directory.',
      defaultValue: null,
      type: 'string'
    },

    '--buildapp': {
      type: 'string',
      choices: ['device', 'desktop', 'emulator'],
      defaultValue: 'desktop',
      help: 'Type of gecko application to run.'
    },

    '--runtime': {
      defaultValue: null,
      help: 'Path to b2g-bin when using buildapp=desktop'
    },

    '--device-type': {
      dest: 'device_type',
      defaultValue: 'phone'
    },

    '--dump-path': {
      dest: 'dump_path',
      defaultValue: process.cwd() + '/crash',
      help: 'path in which to store crash dumps. Will default to ' +
            'the \'minidumps\' directory in the current working directory'
    },

    '--chrome': {
      defaultValue: 'chrome://b2g/content/shell.html',
      help: '--chrome option to set when starting b2g-desktop'
    }
  }
};

/**
 * @return {Promise<Host>}
 */
exports.createHost = function() {
  let host = new Host();
  return host.start().then(() => host);
};

/**
 * @return {Promise<Session>}
 */
exports.createSession = function(host, profile, options) {
  options = Object.assign({profile, buildapp: 'desktop'}, options);
  let ctor = options.buildapp === 'device' ?
    require('./session/device_session') :
    require('./session/non_device_session');
  let session = new ctor(host, options);
  return session.start().then(() => session);
};
