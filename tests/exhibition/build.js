'use strict';

// Imports
var childProc = require('child_process');
var proc = require('process');

// Child process options.
var childProcOptions = { cwd: proc.cwd(),
                         stdio: [proc.stdin, proc.stdout, proc.stderr] };

// Build System Test Suites
var unit = {
  cmd: 'make',
  args: ['build-test-unit']
};

var integration = {
  cmd: 'make',
  args: ['build-test-integration']
};

// Complete list of Build System Tests Suites
var suites = {
  unit: unit,
  integration: integration
};

// Helper runs the specified suite
function runTestSuite(suite) {
  console.log('Running', suite, 'tests');
  try {
    childProc.execFileSync(suites[suite].cmd,
                           suites[suite].args,
                           childProcOptions);
  }
  catch(e) {
    console.error(e);
    return 1;
  }

  return 0;
}

// Main command entry-point.
export function testBuild(args) {
  let suite = args['--suite'];
  // First, look for magic 'all' suite.
  if (suite == 'all') {
    // Run all suites.
    Object.keys(suites).forEach(function(suiteName) {
      if (runTestSuite(suiteName) !== 0) {
        proc.exit(1);
      }
    });

    proc.exit(0);
  }

  if (!suites[suite]) {
    console.error(suite, 'is not a valid test suite.');
    proc.exit(1);
  }

  proc.exit(runTestSuite(suite));
}
