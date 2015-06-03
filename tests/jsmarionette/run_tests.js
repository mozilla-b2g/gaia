#!/usr/bin/env node
'use strict';

/**
 * @fileoverview Runs all jsmarionette unit tests. Does not run ui tests.
 */
var Mocha = require('mocha');
var path = require('path');

var configs = Object.freeze({
  /* client */
  'json-wire-protocol': {
    tests: ['test/index-test']
  },

  'marionette-client': {
    entrypoint: 'test/helper',
    tests: [
      'test/node/connection-manager-test',
      'test/marionette/drivers/abstract-test',
      'test/marionette/drivers/tcp-test',
      'test/marionette/drivers/tcp-sync-test',
      'test/marionette/actions-test',
      'test/marionette/client-test',
      'test/marionette/command-stream-test',
      'test/marionette/error-test',
      'test/marionette/index-test',
      'test/marionette/multi-actions-test'
    ]
  },

  'socket-retry-connect': {
    tests: ['test']
  },

  'sockit-to-me': {
    tests: ['test/sockit_test']
  },

  /* mocha */
  'mocha-json-proxy': {
    entrypoint: 'test/helper',
    tests: [
      'test/acceptance/consumer',
      'test/acceptance/reporter',
      'test/consumer',
      'test/reporter'
    ]
  },

  'mocha-tbpl-reporter': {
    tests: ['test/tbpl_test']
  },

  /* plugins */
  'marionette-file-manager': {
    tests: ['test/unit/desktop_client_file_manager_test']
  },

  'marionette-plugin-forms': {
    entrypoint: 'test/test-helper',
    tests: [
      'test/unit/tests/formatters/date',
      'test/unit/tests/formatters/time',
      'test/unit/tests/utils/padzeros'
    ]
  },

  /* runner */
  'marionette-profile-builder': {
    entrypoint: 'test/helper',
    tests: ['test/index']
  },

  'mozilla-profile-builder': {
    entrypoint: 'test/helper',
    tests: [
      'test/createprofile',
      'test/gaiaprofile',
      'test/index',
      'test/pref',
      'test/profile'
    ]
  },

  'marionette-js-runner': {
    entrypoint: 'test/helper',
    tests: [
      'test/bin/apply-manifest_test',
      'test/bin/consolelog_test',
      // TODO(gareth): Re-enable marionette-js-runner tests which launch b2g
      //'test/bin/crash_test',
      //'test/bin/marionette-mocha_test',
      //'test/bin/sigint_test',
      'test/error_ipc_test',
      'test/optsfileparser_test',
      'test/rpc_test'
    ]
  },

  'mozilla-runner': {
    'tests': [
      'test/detectbinary',
      'test/run'
    ]
  }
});

function configureMocha(mocha, key, config) {
  if (config.entrypoint) {
    require(norm(__dirname, '../../node_modules', key, config.entrypoint));
  }

  config.tests.forEach(function(test) {
    mocha.addFile(norm(__dirname, '../../node_modules', key, test));
  });
}

function main() {
  var mocha = new Mocha({
    reporter: process.env.REPORTER || 'spec',
    timeout: '10s',
    ui: 'tdd'
  });

  for (var key in configs) {
    var config = configs[key];
    configureMocha(mocha, key, config);
  }

  mocha.run(function(failures) {
    process.exit(failures);
  });
}

function norm() {
  var args = Array.prototype.slice.call(arguments);
  return path.normalize(path.resolve.apply(path, args));
}

if (require.main === module) {
  main();
}
