#!/usr/bin/env node
'use strict';

/**
 * @fileoverview Runs all jsmarionette unit tests. Does not run ui tests.
 */
var Mocha = require('mocha');

var configs = Object.freeze({
  'mocha/mocha-json-proxy': {
    entrypoint: 'test/helper',
    tests: [
      'test/acceptance/consumer',
      'test/acceptance/reporter',
      'test/consumer',
      'test/reporter'
    ]
  },

  'mocha/mocha-tbpl-reporter': {
    tests: ['test/tbpl_test']
  },

  'plugins/marionette-file-manager': {
    tests: ['test/unit/desktop_client_file_manager_test']
  },

  'plugins/marionette-plugin-forms': {
    entrypoint: 'test/test-helper',
    tests: [
      'test/unit/tests/formatters/date',
      'test/unit/tests/formatters/time',
      'test/unit/tests/utils/padzeros'
    ]
  },

  'runner/marionette-profile-builder': {
    entrypoint: 'test/helper',
    tests: ['test/index']
  },

  'runner/mozilla-profile-builder': {
    entrypoint: 'test/helper',
    tests: [
      'test/createprofile',
      'test/gaiaprofile',
      'test/index',
      'test/pref',
      'test/profile'
    ]
  },

  'runner/mozilla-runner': {
    tests: [
      'test/detectbinary',
      'test/run'
    ]
  },

  'runner/marionette-js-runner': {
    entrypoint: 'test/helper',
    tests: [
      'test/bin/apply-manifest_test',
      // TODO(gareth): Re-enable marionette-js-runner tests which launch b2g
      //'test/bin/consolelog_test',
      //'test/bin/crash_test',
      //'test/bin/marionette-mocha_test',
      //'test/bin/sigint_test',
      'test/error_ipc_test',
      'test/optsfileparser_test',
      'test/rpc_test'
    ]
  }
});

function configureMocha(mocha, key, config) {
  if (config.entrypoint) {
    var entrypoint = __dirname + '/' + key + '/' + config.entrypoint;
    require(entrypoint);
  }

  config.tests.forEach(function(test) {
    var file = __dirname + '/' + key + '/' + test;
    mocha.addFile(file);
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

if (require.main === module) {
  main();
}
