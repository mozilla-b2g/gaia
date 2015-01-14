#!/usr/bin/env node
'use strict';

var exec = require('child_process').exec;

function main(callback) {
  var env = JSON.parse(JSON.stringify(process.env));
  env.TEST_FILES = 'apps/gallery/test/marionette/edit_image_test.js';
  env.cwd = '../../../../';
  var command = exec.bind(null, 'xvfb-run make test-integration', { env: env });
  statisticalTest(command, {
    z: 1.9599,  // 95% confidence
    error: 0.01,
    isPass: function(error, stdout, stderr) {
      return !!error || stdout.indexOf('Polling socket recv() timeout!') === -1;
    }
  }, callback);
}

function statisticalTest(command, options, callback) {
  runTest(command, options, callback, 0, 0, 0);
}

function runTest(command, options, callback, trial, pass, fail) {
  trial += 1;
  process.stdout.write('Will run trial ' + trial);
  var ellipses = setInterval(function() { process.stdout.write('.'); }, 1000);
  var start = Date.now();

  command(function(err, stdout, stderr) {
    clearInterval(ellipses);
    console.log(' finished in ' + (Date.now() - start) / 1000 + 's.');
    var result = options.isPass(err, stdout, stderr);
    console.log(result ? 'PASS' : 'FAIL');
    if (result) {
      pass += 1;
    } else {
      fail += 1;
    }

    var error = options.z / (2 * Math.pow(trial, 1 / 2));
    var p = pass / trial;
    var lowerBound = p - error;
    var upperBound = p + error;
    console.log(
      Math.max(lowerBound, 0) +
      ' < r < ' +
      Math.min(upperBound, 1) +
      ' with error=' +
      error
    );

    // Check whether we need to continue testing.
    if (error <= options.error) {
      console.log('Done');
      return callback && callback();
    }

    runTest(command, options, callback, trial, pass, fail);
  });
}

marionette('bug 1091680', function() {
  test('statistical test', main);
});
