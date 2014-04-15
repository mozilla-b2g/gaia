'use strict';

var childProcess = require('child_process'),
    fs = require('fs'),
    request = require('request');

var PULL_REQUEST_URL_PATTERN =
      'https://api.github.com/repos/mozilla-b2g/gaia/pulls/[id]/files',
    MARIONETTE_TEST_FILE_NAME_PATTERN =
      /apps\/[a-z]+\/test\/marionette\/[\w\/]+_test.js/;

/**
 * Get file name list of marionette test in the current pull request on Travis.
 */
var PullRequestMarionetteTest = (function() {
  /**
   * Get files in a pull request.
   *
   * @param {String|Number} id The pull request id.
   * @param {Function} callback Function with the pull request files array.
   */
  function getPullRequestFiles(id, callback) {
    // Configure the request
    var options = {
      url: PULL_REQUEST_URL_PATTERN.replace('[id]', id),
      method: 'GET',
      headers: { 'User-Agent': 'FirefoxOS-Gaia-Travis' }
    };

    request(options, function(error, response, body) {
      if (!error && response.statusCode == 200) {
        var json = JSON.parse(body),
            fileNames = [];

        json.forEach(function(file) {
          fileNames.push(file.filename);
        });
        if (callback && typeof(callback) === 'function') {
          callback(fileNames);
        }
      } else {
        throw new Error('Cannot access GitHub API.');
      }
    });
  }

  // Main function.
  function execute() {
    // Pull request ID for the current Travis job.
    var pullRequestId = process.env.TRAVIS_PULL_REQUEST;

    getPullRequestFiles(pullRequestId, function(fileNames) {
      var testFileNames = [],
          returnString = '';

      testFileNames = fileNames.filter(function(filename) {
                        // Get the marionette test file list in the patch.
                        if (filename.match(MARIONETTE_TEST_FILE_NAME_PATTERN) &&
                            fs.existsSync(filename)) {
                          return true;
                        }
                      });
      if (testFileNames.length > 0) {
        returnString = testFileNames.toString().split(',').join(' ');
      }
      console.log(returnString);
    });
  }

  return {
    execute: execute
  };
})();

PullRequestMarionetteTest.execute();
