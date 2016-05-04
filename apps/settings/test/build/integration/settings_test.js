'use strict';

/* jshint node: true, mocha: true */
/* global suiteSetup */

var helper = require('helper');

suite('Settings tests', function() {
  suiteSetup(helper.cleanupWorkspace);
  teardown(helper.cleanupWorkspace);

  test('APP=settings make', function(done) {
    helper.exec('APP=settings make', function(error, stdout, stderr) {
      helper.checkError(error, stdout, stderr);

      var folderPath = process.cwd() + '/profile/apps/settings/';
      var checkList = ['manifest.webapp', 'index.html'];

      checkList.forEach(function(filePath) {
        helper.checkFilePathInFolder(folderPath, filePath);
      });

      done();
    });
  });
});
