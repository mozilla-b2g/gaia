'use strict';

var assert = require('chai').assert;
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var helper = require('./helper');
var rmrf = require('rimraf').sync;

suite('Make with desktop custom core apps location', function() {
  suiteSetup(helper.cleanupWorkspace);
  teardown(helper.cleanupWorkspace);

  test('make with desktop custom core apps location', function(done) {
    var coreAppPath = path.join(process.cwd(), 'profile-coreapptest');
    var coretest = function(error, stdout, stderr) {
      helper.checkError(error, stdout, stderr);

      var expectedUserPrefs = {
        'b2g.coreappsdir': coreAppPath
      };
      var userjs = fs.readFileSync(
          path.join('profile', 'user.js'),
          { encoding: 'utf8' }
      );
      var sandbox = helper.getPrefsSandbox();
      vm.runInNewContext(userjs, sandbox);

      helper.checkPrefs(sandbox.userPrefs, expectedUserPrefs);
      var oldAppPath = path.join(process.cwd(), 'profile', 'webapps');
      // Make sure we have no webapps directory in the profile, this
      // will now be created by gecko on start.
      assert(!fs.existsSync(oldAppPath));
      var manifestPath = path.join(coreAppPath, 'webapps',
                              'webapps.json');
      assert(fs.existsSync(manifestPath));
      var appPath = path.join(coreAppPath, 'webapps',
                              'system.gaiamobile.org', 'application.zip');
      assert(fs.existsSync(appPath));
      rmrf(coreAppPath);
      done();
    };
    helper.exec('COREWEBAPPS_DIR=' + coreAppPath +' make ',
                coretest);
  });
});
