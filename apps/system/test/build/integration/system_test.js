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

      var folderPath = process.cwd() + '/profile/apps/system/';
      var checkList = ['manifest.webapp', 'index.html'];

      checkList.forEach(function(filePath) {
        helper.checkFilePathInFolder(folderPath, filePath);
      });

      done();
    });
  });

  suite('System/FeatureDetector tests', function() {
    // XXX: TV doesn't use apps/system. Test for tv should be enabled once
    //      smart-system is merged back to apps/system.
    var devices = ['phone', 'tablet'];

    devices.forEach(function(device) {
      var command = 'GAIA_DEVICE_TYPE=' + device + ' APP=system make';
      test(command, function(done) {
        helper.exec(command, function(error, stdout, stderr) {
          helper.checkError(error, stdout, stderr);

          var folderPath = process.cwd() + '/profile/apps/system/';

          // FeatureDetector.deviceType is expected to be replaced by
          // GAIA_DEVICE_TYPE in build time
          var pattern = new RegExp('this\.deviceType = \'' + device + '\';');

          helper.matchFileContentInFolder(
            folderPath, 'js/feature_detector.js', pattern);

          done();
        });
      });
    });
  });
});
