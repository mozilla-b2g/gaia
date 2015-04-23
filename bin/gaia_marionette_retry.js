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

  /**
   * Walk from the beginning of the cli args to the point where
   * we no longer have args of the form
   * --arglike --key value --argish --argonaut --otherkey othervalue
   */
  var expectKey = true;
  var index = indexOf(process.argv, function(arg, index) {
    var isKey = arg.slice(0, 2) === '--';
    if (!isKey && expectKey) {
      // We were expecting a key and didn't see one so we've found the index.
      return true;
    }

    expectKey = !isKey;
    return false;
  });

  var args = process.argv.splice(0, index);
  var filenames = process.argv;

  // Also look at the end of the cli invocation for cli args.
  index = indexOf(filenames, function(arg, index) {
    return arg.slice(0, 2) === '--';
  });

  // Pull everything off from the first arg.
  args = args.concat(filenames.splice(index, filenames.length - index));

  if (!filenames || !filenames.length) {
    return summarize({ pass: 0, fail: 0, pending: 0 });
  }

  if (filenames[0].indexOf('setup') !== -1) {
    // Special case for setup script.
    args.push(filenames.shift());
  }

  runTests(filenames, args, 5 /* retry */).then(summarize);
}

function summarize(results) {
  console.log('*~*~* Results *~*~*');
  console.log('passed: %d', results.pass);
  console.log('failed: %d', results.fail);
  console.log('todo: %d', results.pending);
  if (results.fail > 0) {
    process.exit(1);
  }
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
  var tally = {};
  return runTests(filenames, args, retry)
  .then(function(results) {
    [
      'pass',
      'fail',
      'pending'
    ].forEach(function(key) {
      tally[key] = results[key] || 0;
    });

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
    forEach({
      pass: 'passed',
      fail: 'failed',
      pending: 'todo'
    }, function(string, key) {
      var regexp = new RegExp(string + ':\\s*(\\d+)');
      var match = stdout.match(regexp);
      var count;
      try {
        count = parseInt(match[1]);
      } catch (error) {
        console.error(error);
        console.error(
          'Couldn\'t find ' + string + ' count in marionette-mocha output:\n' +
          stdout
        );

        return;
      }

      tally[key] += count;
      if (key === 'fail' && count > 0) {
        // Print out the exit code.
        console.log('Exit code %d', result.code);
      }
    });

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
      console.error('[marionette-mocha] ' + data);
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

function forEach(obj, fn) {
  for (var key in obj) {
    fn(obj[key], key);
  }
}

function indexOf(arr, fn) {
  var result = -1;
  arr.some(function(currentValue, index) {
    if (fn(currentValue)) {
      result = index;
      return true;
    }

    return false;
  });

  return result;
}

if (require.main === module) {
  main();
}
