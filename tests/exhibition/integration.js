'use strict';

// Local imports
var runQueue = require('./lib/runner.js').runQueue;

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
var suites = [jsmarionette];

// Main command entry-point.
export function testIntegration(args) {
  return runQueue(preReqs).then(runQueue(suites));
}
