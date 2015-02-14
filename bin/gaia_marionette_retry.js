#!/usr/bin/env node
/**
 * @fileoverview This script runs js marionette tests and has a bit of logic
 *     to retry test files on failure to reduce the extent to which
 *     transient/intermittent harness issues show up as breakages on CI.
 */
var Promise = require('es6-promise').Promise;
var format = require('util').format;
var path = require('path');
var spawn = require('child_process').spawn;

/**
 * Here we just parse whatever gets passed to ./bin/gaia-marionette so
 * that we can separate the test files that need to be run from
 * marionette-mocha and mocha args.
 */
function main() {
  // 0 => node
  // 1 => ./bin/gaia_marionette_retry.js
  process.argv.splice(0, 2);

  var index = 0;
  while (process.argv[index].slice(0, 2) === '--') {
    index += 2;
  }

  var args = process.argv.splice(0, index);
  var filenames = process.argv;

  // Also look at the end of the cli invocation for cli args.
  var count = 0;
  index = filenames.length;
  while (filenames[index - 2].slice(0, 2) === '--') {
    count += 2;
    index -= 2;
  }

  args = args.concat(filenames.splice(index, count));

  if (filenames[0].indexOf('setup') !== -1) {
    // Special case for setup script.
    args.push(filenames.shift());
  }

  runTests(filenames, args, 5 /* retry */).then(function(results) {
    // Summarize.
    console.log('*~*~* Results *~*~*');
    console.log('passed: %d', results.pass);
    console.log('failed: %d', results.fail);
    console.log('todo: %d', results.pending);
  });
}

/**
 * @return {Promise} representing the tallied result of running all the files
 *     in the filenames array.
 *
 * Internally we use recursion where the base case is no test files to run and
 * the inductive case runs a single test file (perhaps with retries in case
 * of failure) and augments the running results with an incremental result
 * from the one test file.
 */
function runTests(filenames, args, retry) {
  if (filenames.length === 0) {
    // All done!
    return Promise.resolve({ pass: 0, fail: 0, pending: 0 });
  }

  var next = filenames.pop();
  var tally;
  return runTests(filenames, args, retry)
  .then(function(results) {
    tally = results;
    return runTest(next, args, retry);
  })
  .then(function(result) {
    // Now we have to output our result and package it
    // so that it can be aggregated for final results.
    var stdout = result.stdout;
    // This is the bit before the test run's mocha "epilogue".
    var incremental = stdout.slice(0, stdout.indexOf('*~*~*'));
    // Print incremental result.
    process.stdout.write(incremental);
    // Parse the epilogue to get pass, fail, and pending counts.
    var pass = parseInt(stdout.match(/passed:\s*(\d+)/)[1]);
    var fail = parseInt(stdout.match(/failed:\s*(\d+)/)[1]);
    var pending = parseInt(stdout.match(/todo:\s*(\d+)/)[1]);
    tally.pass += pass;
    tally.fail += fail;
    tally.pending += pending;

    if (fail) {
      // Print out the exit code.
      console.log('Exit code %d', result.code);
    }

    return Promise.resolve(tally);
  })
  .catch(function(error) {
    console.error('Something is really wrong!!');
    console.error(error.toString());
  });
}

/**
 * @return {Promise} representing the result of running a single test file
 *     (possibly multiple times in case of failure).
 *
 * Internally, we call node's ChildProcess#spawn to execute marionette-mocha.
 * Then we buffer stdout and stderr and when the child process closes, we
 * check whether any test cases failed. If all tests passed, we resolve with
 * the child process' output. If any failed, then we check whether we have any
 * retries remaining. If we don't, then we resolve with the failure output.
 * If we do have remaining retries, then we recur with one fewer retry.
 */
function runTest(filename, args, retry) {
  return new Promise(function(resolve, reject) {
    var command = path.resolve(__dirname, '../node_modules/.bin/marionette-mocha');
    args = args.concat(filename);

    var jsmarionette = spawn(command, args);
    var stdout = '',
        stderr = '';

    jsmarionette.stdout.on('data', function(data) {
      // Write a dot when jsmarionette says something to avoid timing out.
      stdout += data.toString();
      process.stdout.write('.');
    });

    jsmarionette.stderr.on('data', function(data) {
      stderr += data.toString();
    });

    jsmarionette.on('close', function(code) {
      process.stdout.write('\n');
      if (retry === 0 || !testDidFailOnTbpl(stdout, stderr)) {
        // No more retries or the test actually passed.
        return resolve({ code: code, stdout: stdout, stderr: stderr });
      }

      // Retry and then resolve with the retry result.
      console.log(filename + ' failed. Will retry.');
      setTimeout(function() {
        runTest(filename, args, retry - 1).then(resolve);
      }, 5 * 1000);
    });
  });
}

/**
 * Checks whether a single test file failed.
 */
function testDidFailOnTbpl(stdout, stderr) {
  return stdout.indexOf('TEST-UNEXPECTED-FAIL') !== -1;
}

if (require.main === module) {
  main();
}
