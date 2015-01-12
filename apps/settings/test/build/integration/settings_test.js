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

      var zipPath = process.cwd() +
        '/profile/webapps/settings.gaiamobile.org/application.zip';
      var checkList = ['manifest.webapp'];

      checkList.forEach(function(filePath) {
        helper.checkFilePathInZip(zipPath, filePath);
      });

      done();
    });
  });
});
