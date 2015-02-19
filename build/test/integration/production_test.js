'use strict';

var assert = require('chai').assert;
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var helper = require('./helper');

suite('PRODUCTION=1', function() {
  suiteSetup(helper.cleanupWorkspace);
  teardown(helper.cleanupWorkspace);

  test('make with PRODUCTION=1', function(done) {
    helper.exec('PRODUCTION=1 make', function(error, stdout, stderr) {
      helper.checkError(error, stdout, stderr);

      var settingsPath = path.join(process.cwd(), 'profile', 'settings.json');
      var settings = JSON.parse(fs.readFileSync(settingsPath));
      var expectedSettings = {
        'feedback.url': 'https://input.mozilla.org/api/v1/feedback/'
      };
      var userjs = fs.readFileSync(
        path.join('profile', 'user.js'),
        { encoding: 'utf8' }
      );
      var sandbox = helper.getPrefsSandbox();
      vm.runInNewContext(userjs, sandbox);

      helper.checkSettings(settings, expectedSettings);
      assert.isUndefined(sandbox.prefs['dom.payment.skipHTTPSCheck']);

      // zip path for system app
      var zipPath = path.join(process.cwd(), 'profile', 'webapps',
        'uitest.gaiamobile.org', 'application.zip');

      // uitest should not exists in production builds
      assert.isFalse(fs.existsSync(zipPath));
      done();
    });
  });

});
