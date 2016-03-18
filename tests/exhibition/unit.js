'use strict';

// Local imports
var runQueue = require('./lib/runner.js').runQueue;

// Pre-reqs
var preReqs = [
  { cmd: 'make', args: ['mulet'] },
  { cmd: 'make', args: ['caldav-server-install'] },
  { cmd: 'make', args: ['test-agent-server'],
                 bg: true,
                 waitFor: { host: 'localhost',
                            port: process.env.TEST_AGENT_PORT || 8789 } },
  { cmd: 'make', env: { NO_LOCK_SCREEN: 1,
                        DEBUG: 1,
                        DESKTOP: 0,
                        WGET_OPTS: '-nv'} },
  { cmd: './firefox/Contents/MacOS/firefox-bin',
    args: ['-profile', './profile-debug',
           'app://test-agent.gaiamobile.org/'],
    bg: true,
    waitFor: { host: 'localhost',
               port: 8080 } }
];

// Individual Unit Test Suites.
var unit = {
  cmd: './node_modules/test-agent/bin/js-test-agent',
  args: ['test',
         '--this-chunk', process.env.THIS_CHUNK || 1,
         '--total-chunks', process.env.TOTAL_CHUNKS || 1,
         '--server', 'ws://localhost:' + process.env.TEST_AGENT_PORT || 8789,
         '--reporter', process.env.REPORTER || 'spec' ]
};

// Complete list of Unit Test Suites.
var suites = [unit];

// Main command entry-point.
export function testUnit(args) {
  // Run all pre-reqs and then all suites.
  return Promise.all(runQueue(preReqs)).then(function() { runQueue(suites); });
}
