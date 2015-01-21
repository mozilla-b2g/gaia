'use strict';

/* jshint node: true, mocha: true */
/* global suiteSetup */

var helper = require('helper');

suite('System tests', function() {
  suiteSetup(helper.cleanupWorkspace);
  teardown(helper.cleanupWorkspace);

  test('APP=system make', function(done) {
    helper.exec('APP=system make', function(error, stdout, stderr) {
      helper.checkError(error, stdout, stderr);

      var zipPath = process.cwd() +
        '/profile/webapps/system.gaiamobile.org/application.zip';
      var checkList = ['manifest.webapp'];

      checkList.forEach(function(filePath) {
        helper.checkFilePathInZip(zipPath, filePath);
      });

      done();
    });
  });
});
