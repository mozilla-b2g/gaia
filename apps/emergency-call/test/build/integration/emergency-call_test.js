'use strict';

/* jshint node: true, mocha: true */
/* global suiteSetup */

var helper = require('helper');

suite('Emergency-call tests', function() {
  suiteSetup(helper.cleanupWorkspace);
  teardown(helper.cleanupWorkspace);

  test('APP=emergency-call make', function(done) {
    helper.exec('APP=emergency-call make', function(error, stdout, stderr) {
      helper.checkError(error, stdout, stderr);

      var zipPath = process.cwd() +
        '/profile/webapps/emergency-call.gaiamobile.org/application.zip';
      var checkList = ['manifest.webapp'];

      checkList.forEach(function(filePath) {
        helper.checkFilePathInZip(zipPath, filePath);
      });

      done();
    });
  });
});
