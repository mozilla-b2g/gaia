var rmrf = require('rimraf').sync;
var exec = require('child_process').exec;
var vm = require('vm');
var AdmZip = require('adm-zip');
var helper = require('./helper');
var path = require('path');
var assert = require('chai').assert;
var fs = require('fs');

suite('Distribution mechanism', function() {
  suiteSetup(function() {
    rmrf('profile');
  });

  function validateSettings() {
    var settingsPath = path.join(process.cwd(), 'profile', 'settings.json');
    var settings = JSON.parse(fs.readFileSync(settingsPath));
    var expectedSettings = {
      'wap.push.enabled': false
    };

    helper.checkSettings(settings, expectedSettings);
  }

  function validateCalendar() {
    var calZip = new AdmZip(path.join(process.cwd(), 'profile',
      'webapps', 'calendar.gaiamobile.org', 'application.zip'));
    var presetsContent = calZip.readAsText(calZip.getEntry('js/presets.js'));
    assert.isNotNull(presetsContent, 'js/presets.js should exist');
    var sandbox = { Calendar: { Presets: null } };
    vm.runInNewContext(presetsContent, sandbox);
    assert.isDefined(sandbox.Calendar.Presets['Test Provider'],
      'Test Provider should be defined');
    assert.equal(sandbox.Calendar.Presets['Test Provider'].providerType,
      'Local', 'Property providerType should equal "Local"')
  }

  function validateWappush() {
    var wappushZip = new AdmZip(path.join(process.cwd(), 'profile',
      'webapps', 'wappush.gaiamobile.org', 'application.zip'));
    var whitelist =
      wappushZip.readAsText(wappushZip.getEntry('js/whitelist.json'));
    assert.isNotNull(whitelist, 'js/whitelist.json should exist');
    var list = JSON.parse(whitelist);
    assert.isDefined(list[0], 'whitelist[0] should be defined');
    assert.equal(list[0], '9871010079',
      'whitelist[0] should equal "9871010079"');
  }

  test('build with GAIA_DISTRIBUTION_DIR', function(done) {
    var distDir = path.join(process.cwd(), 'build', 'test', 'resources',
      'distribution_test');
    var cmd = 'GAIA_DISTRIBUTION_DIR=' + distDir + ' make';
    exec(cmd, function(error, stdout, stderr) {
      helper.checkError(error, stdout, stderr);
      validateSettings();
      validateCalendar();
      validateWappush();
      done();
    });
  });

  teardown(function() {
    rmrf('profile');
  });
});
