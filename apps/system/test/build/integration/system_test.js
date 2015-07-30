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

  suite('System/FeatureDetector tests', function() {
    var devices = ['phone', 'tablet', 'tv'];

    devices.forEach(function(device) {
      var command = 'GAIA_DEVICE_TYPE=' + device + ' APP=system make';
      test(command, function(done) {
        helper.exec(command, function(error, stdout, stderr) {
          helper.checkError(error, stdout, stderr);

          var zipPath = process.cwd() +
            '/profile/webapps/system.gaiamobile.org/application.zip';

          // FeatureDetector.deviceType is expected to be replaced by
          // GAIA_DEVICE_TYPE in build time
          var pattern = new RegExp('this\.deviceType = \'' + device + '\';');

          helper.matchFileContentInZip(
            zipPath, 'js/feature_detector.js', pattern);

          done();
        });
      });
    });
  });
});
