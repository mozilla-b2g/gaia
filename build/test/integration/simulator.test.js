var assert = require('chai').assert;
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var helper = require('./helper');

suite('simulator', function() {
  suiteSetup(helper.cleanupWorkspace);
  teardown(helper.cleanupWorkspace);

  test('make with SIMULATOR=1', function(done) {
    helper.exec('SIMULATOR=1 make', function(error, stdout, stderr) {
      helper.checkError(error, stdout, stderr);

      var settingsPath = path.join(process.cwd(), 'profile-debug',
        'settings.json');
      var settings = JSON.parse(fs.readFileSync(settingsPath));
      var expectedSettings = {
        'lockscreen.enabled': false,
        'lockscreen.locked': false,
        'screen.timeout': 0,
        'debugger.remote-mode': 'adb-devtools'
      };
      var expectedUserPrefs = {
        'extensions.autoDisableScopes': 0,
        'devtools.debugger.prompt-connection': false,
        'devtools.debugger.forbid-certified-apps': false,
        'javascript.options.discardSystemSource': false,
        'b2g.adb.timeout': 0
      };
      var userjs = fs.readFileSync(
        path.join('profile-debug', 'user.js'),
        { encoding: 'utf8' }
      );
      var sandbox = helper.getPrefsSandbox();
      vm.runInNewContext(userjs, sandbox);

      helper.checkSettings(settings, expectedSettings);
      helper.checkPrefs(sandbox.userPrefs, expectedUserPrefs);
      done();
    });
  });
});
