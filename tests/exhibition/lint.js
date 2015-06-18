'use strict';

// Local imports
var run = require('./lib/runner.js').run;

// Individual Linters
var csslint = {
  name: 'CSSLint',
  cmd: 'make',
  args: ['csslint']
};

var eslint = {
  name: 'ESLint',
  cmd: 'make',
  args: ['eslint']
};

var jshint = {
  name: 'JSHint',
  cmd: 'make',
  args: ['hint']
};

var jsonlint = {
  name: 'JSONLint',
  cmd: 'make',
  args: ['jsonlint']
};

// Complete list of Linters.
var linters = {
  csslint: csslint,
  eslint: eslint,
  jshint: jshint,
  jsonlint: jsonlint
};

// Main command entry-point.
export function lint(args) {
  // Figure out which linter we're supposed to run.
  let linter = args['--with'];

  // Check for magic 'all' linter.
  if (linter == 'all') {
    Object.keys(linters).forEach(linter => run(linters[linter]));
    return;
  }

  // Check for invalid linter value.
  if (!linters[linter]) {
    console.error(linter, 'is not a valid linter.');
    process.exit(1);
  }

  // Run the linter.
  run(linters[linter]);
}
