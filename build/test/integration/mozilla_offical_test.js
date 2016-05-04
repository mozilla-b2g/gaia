'use strict';

// var path = require('path');
var helper = require('./helper');

suite('MOZILLA_OFFICAL=1', function() {
  suiteSetup(helper.cleanupWorkspace);
  teardown(helper.cleanupWorkspace);

  test('make with MOZILLA_OFFICIAL=1', function(done) {
    helper.exec('MOZILLA_OFFICIAL=1 make', function(error, stdout, stderr) {
      helper.checkError(error, stdout, stderr);

      // FIXME: Broken because of Bug 1268477
      // path in zip for unofficial branding
      // var pathInFolder = 'shared/resources/branding/initlogo.png';
      // zip path for system app
      // var folderPath = path.join(process.cwd(), 'profile', 'apps');
      // var expectedBrandingPath = path.join(process.cwd(),
      //   'shared', 'resources', 'branding', 'official', 'initlogo.png');

      // helper.checkFileInFolder(
      //   folderPath, pathInFolder, expectedBrandingPath);
      done();
    });
  });
});
