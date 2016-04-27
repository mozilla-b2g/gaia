'use strict';

/* jshint node: true, mocha: true */
/* global suiteSetup */

var helper = require('helper');

suite('Homescreen tests', function() {
  suiteSetup(helper.cleanupWorkspace);
  teardown(helper.cleanupWorkspace);

  test('APP=homescreen make', function(done) {
    helper.exec('APP=homescreen make', function(error, stdout, stderr) {
      helper.checkError(error, stdout, stderr);

      var folderPath = process.cwd() + '/profile/apps/homescreen/';
      var checkList = ['manifest.webapp', 'index.html'];

      checkList.forEach(function(filePath) {
        helper.checkFilePathInFolder(folderPath, filePath);
      });

      done();
    });
  });
});
