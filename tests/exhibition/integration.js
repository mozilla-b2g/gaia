'use strict';

// Local imports
var run = require('./lib/runner.js').run;

// Pre-reqs
var preReqs = [
  { name: 'Mulet Desktop', cmd: 'make', args: ['mulet'] },
  { name: 'CalDAV Server', cmd: 'make', args: ['caldav-server-install'] },
  { name: 'Gaia Profile', cmd: 'make', env: { PROFILE_FOLDER: 'profile-test' } }
];

// Individual Integration Test Suites
var jsmarionette = {
  name: 'JS Marionette Integration Tests (Gij)',
  cmd: 'node_modules/.bin/gaia-marionette',
  args: ['--reporter=mocha-tbpl-reporter',
         '--buildapp=desktop']
};

// Complete list of test suites
var suites = {
  jsmarionette: jsmarionette
};

// Main command entry-point.
export function testIntegration(args) {

  // XXXAus: Add support for --device-type.

  // Run all pre-reqs.
  preReqs.forEach(preReq => run(preReq));

  // Run all suites.
  Object.keys(suites).forEach(suite => run(suites[suite]));
}
