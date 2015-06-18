'use strict';

// Local imports
var run = require('./lib/runner.js').run;

// Pre-reqs
var preReqs = [
  { cmd: 'make', args: ['mulet'] },
  { cmd: 'make', args: ['caldav-server-install'] },
  { cmd: 'make', args: ['test-agent-server'],
                 bg: true,
                 waitFor: { host: 'localhost',
                            port: process.env.TEST_AGENT_PORT || 8789 } }
];

// Individual Unit Test Suites.
var unit = {
  cmd: 'make',
  args: ['test-agent-test']
};

// Complete list of Unit Test Suites.
var suites = [unit];

// Main command entry-point.
export function testUnit(args) {
  // Run all pre-reqs.
  preReqs.forEach(preReq => run({ cmd: preReq.cmd, args: preReq.args}));

  // Run all suites.
  suites.forEach(suite => run({ cmd: suite.cmd, args: suite.args }));
}
