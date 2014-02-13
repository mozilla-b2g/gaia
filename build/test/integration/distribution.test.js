var rmrf = require('rimraf').sync;
var exec = require('child_process').exec;
var vm = require('vm');
var AdmZip = require('adm-zip');
var helper = require('./helper');
var path = require('path');
var assert = require('chai').assert;
var fs = require('fs');

suite('Distribution mechanism', function() {
  var distDir;
  suiteSetup(function() {
    rmrf('profile');
  });

  function validatePreloadSettingDB() {
    var settingsPath = path.join(process.cwd(), 'profile', 'settings.json');
    var settings = JSON.parse(fs.readFileSync(settingsPath));
    var expectedSettings = {
      'wap.push.enabled': false
    };

    helper.checkSettings(settings, expectedSettings);
  }

  function validateSettings() {
    var setingsZipPath = path.join(process.cwd(), 'profile',
      'webapps', 'settings.gaiamobile.org', 'application.zip');
    var expectedSupportData = {
      'onlinesupport': {
        'href': 'http://support.mozilla.org/',
        'title': 'Mozilla Support'
      },
      'callsupport': [
        {
          'href': 'tel:12345678',
          'title': 'Call Support 1'
        },
        {
          'href': 'tel:87654321',
          'title': 'Call Support 2'
        }
      ]
    };
    helper.checkFileContentInZip(setingsZipPath, 'resources/support.json',
      expectedSupportData, true);

    var expectedSensorsData = { ambientLight: false };

    helper.checkFileContentInZip(setingsZipPath, 'resources/sensors.json',
      expectedSensorsData, true);
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

  function validateWallpaper() {
    var zip = new AdmZip(path.join(process.cwd(), 'profile',
      'webapps', 'wallpaper.gaiamobile.org', 'application.zip'));
    var listText = zip.readAsText(
      zip.getEntry('resources/320x480/list.json'));
    assert.isNotNull(listText, 'resources/320x480/list.json should exist');
    var list = JSON.parse(listText);
    var expectedList = [
      "efefef.png",
      "FXOS_Illus_Blocks.png",
      "FXOS_Illus_Fox_Nature.png",
      "FXOS_Illus_Mountains.png"
    ];
    assert.deepEqual(list, expectedList,
      'list should match the expected list.');

    var file = zip.readFile(zip.getEntry('resources/320x480/efefef.png'));
    assert.isNotNull(file, 'rresources/320x480/efefef.png should exist');
  }

  function validateBrowser() {
    var appPath = path.join(distDir, 'browser.json');
    var appConfig = JSON.parse(fs.readFileSync(appPath));
    var broZip = new AdmZip(path.join(process.cwd(), 'profile',
      'webapps', 'browser.gaiamobile.org', 'application.zip'));
    var presetsContent = broZip.readAsText(broZip.getEntry('js/init.json'));
    assert.isNotNull(presetsContent, 'js/init.json should exist');
    assert.deepEqual(JSON.parse(presetsContent), appConfig);
  }

  function validateSystem() {
    var icc = path.join(distDir, 'icc.json');
    var iccConfig = JSON.parse(fs.readFileSync(icc));
    var wapuaprof = path.join(distDir, 'wapuaprof.json');
    var wapuaprofConfig = JSON.parse(fs.readFileSync(wapuaprof));
    var power = path.join(distDir, 'power', 'fakePowerFile.json');
    var powerFile = JSON.parse(fs.readFileSync(power));
    var sysZipPath = path.join(process.cwd(), 'profile',
          'webapps', 'system.gaiamobile.org', 'application.zip');

    helper.checkFileContentInZip(sysZipPath, 'resources/icc.json',
      iccConfig, true);
    helper.checkFileContentInZip(sysZipPath, 'resources/wapuaprof.json',
      wapuaprofConfig, true);
    helper.checkFileContentInZip(sysZipPath,
      'resources/power/fakePowerFile.json', powerFile, true);

  }

  function validateSms() {
    var appPath = path.join(distDir, 'sms-blacklist.json');
    var appConfig = JSON.parse(fs.readFileSync(appPath));
    var zipPath = path.join(process.cwd(), 'profile',
      'webapps', 'sms.gaiamobile.org', 'application.zip');
    helper.checkFileContentInZip(zipPath, 'js/blacklist.json',
      appConfig, true);
  }

  function validateCustomizeMaximumImageSize(appConfig, content) {
    var expectedContent =
      '//\n' +
      '// This file is automatically generated: DO NOT EDIT.\n' +
      '// To change these values, create a camera.json file in the\n' +
      '// distribution directory with content like this: \n' +
      '//\n' +
      '//   {\n' +
      '//     "maxImagePixelSize": 6000000,\n' +
      '//     "maxSnapshotPixelSize": 4000000 }\n' +
      '//   }\n' +
      '//\n' +
      '// Optionally, you can also define variables to specify the\n' +
      '// minimum EXIF preview size that will be displayed as a\n' +
      '// full-screen preview by adding a property like this:\n' +
      '//\n' +
      '// "requiredEXIFPreviewSize": { "width": 640, "height": 480}\n' +
      '//\n' +
      '// If you do not specify this property then EXIF previews will only\n' +
      '// be used if they are big enough to fill the screen in either\n' +
      '// width or height in both landscape and portrait mode.\n' +
      '//\n' +
      'var CONFIG_MAX_IMAGE_PIXEL_SIZE = ' +
        appConfig.maxImagePixelSize + ';\n' +
      'var CONFIG_MAX_SNAPSHOT_PIXEL_SIZE = ' +
        appConfig.maxSnapshotPixelSize + ';\n';

    if (appConfig.requiredEXIFPreviewSize) {
      expectedContent +=
        'var CONFIG_REQUIRED_EXIF_PREVIEW_WIDTH = ' +
        appConfig.requiredEXIFPreviewSize.width + ';\n' +
        'var CONFIG_REQUIRED_EXIF_PREVIEW_HEIGHT = ' +
        appConfig.requiredEXIFPreviewSize.height + ';\n';
    } else {
      expectedContent +=
        'var CONFIG_REQUIRED_EXIF_PREVIEW_WIDTH = 0;\n' +
        'var CONFIG_REQUIRED_EXIF_PREVIEW_HEIGHT = 0;\n';
    }

    assert.isNotNull(content, 'js/config.js should exist');
    assert.equal(expectedContent,  content);
  }

  function validateGallery() {
    var distPath = path.join(distDir, 'gallery.json');
    var distConfig = JSON.parse(fs.readFileSync(distPath));
    var appZip = new AdmZip(path.join(process.cwd(), 'profile',
      'webapps', 'gallery.gaiamobile.org', 'application.zip'));
    var presetsContent = appZip.readAsText(appZip.getEntry('js/config.js'));

    validateCustomizeMaximumImageSize(distConfig, presetsContent);
  }

  function validateCamera() {
    var distPath = path.join(distDir, 'camera.json');
    var distConfig = JSON.parse(fs.readFileSync(distPath));
    var appConfigPath =
      path.join(process.cwd(), 'apps', 'camera', 'js', 'config.js');
    var appConfig = fs.readFileSync(appConfigPath, {encoding: 'utf8'});

    validateCustomizeMaximumImageSize(distConfig, appConfig);
  }

  test('build with GAIA_DISTRIBUTION_DIR', function(done) {
    distDir = path.join(process.cwd(), 'build', 'test', 'resources',
      'distribution_test');
    var cmd = 'GAIA_DISTRIBUTION_DIR=' + distDir + ' make';
    exec(cmd, function(error, stdout, stderr) {
      helper.checkError(error, stdout, stderr);
      validatePreloadSettingDB();
      validateSettings();
      validateCalendar();
      validateWappush();
      validateBrowser();
      validateSystem();
      validateSms();
      validateGallery();
      validateCamera();
      done();
    });
  });

  teardown(function() {
    rmrf('profile');
  });
});
