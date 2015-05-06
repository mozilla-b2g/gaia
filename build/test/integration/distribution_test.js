'use strict';

/* jshint maxlen: 130 */

var rmrf = require('rimraf').sync;
var AdmZip = require('adm-zip');
var helper = require('./helper');
var path = require('path');
var assert = require('chai').assert;
var fs = require('fs');
var http = require('http');

suite('Distribution mechanism', function() {
  var cusDir;
  var server;
  var variantPath;
  var originalVariant;

  setup(function() {
    rmrf('profile');
    rmrf('build_stage');

    // Setup local server and handle manifest downloading to avoid remote
    // server dependency
    var fakeManifest = {
      'version': '1.0',
      'name': 'Fake',
      'description': 'Fake app'
    };

    server = http.createServer(function(req, res) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(fakeManifest));
    });

    // Change manifestURL from
    // https://mobile.twitter.com/cache/twitter.webapp
    // to
    // http://localhost:9999/manifest.webapp
    cusDir = path.join(process.cwd(), 'customization');
    variantPath = path.join(cusDir, 'variant.json');
    var port = 9999;
    originalVariant = fs.readFileSync(variantPath, { encoding: 'utf8' });
    var variant = JSON.parse(originalVariant);
    variant.apps.Twitter.manifestURL = 'http://localhost:' + port +
      '/manifest.webapp';
    fs.writeFileSync(variantPath, JSON.stringify(variant));
    server.listen(port);
  });

  function validatePreloadSettingDB() {
    var settingsPath = path.join(process.cwd(), 'profile', 'settings.json');
    var settings = JSON.parse(fs.readFileSync(settingsPath));
    var expectedSettings;
    expectedSettings = JSON.parse(
      fs.readFileSync(path.join(cusDir, 'settings.json')));

    var keyboardManifestURL = 'app://keyboard.gaiamobile.org/manifest.webapp';
    var expectedLayouts = {};
    // For test only, so deliberately makes English map to cs and es layout
    expectedLayouts[keyboardManifestURL] = {cs: true, es: true};

    expectedSettings = {
      'wap.push.enabled': true,
      'keyboard.enabled-layouts': expectedLayouts,
      'keyboard.default-layouts': expectedLayouts
    };

    helper.checkSettings(settings, expectedSettings);
  }

  function validateSettings() {
    var setingsZipPath = path.join(process.cwd(), 'profile',
      'webapps', 'settings.gaiamobile.org', 'application.zip');

    helper.checkFileContentByPathInZip(
      setingsZipPath, 'resources/support.json',
      path.join(cusDir, 'support.json'), true);

    helper.checkFileContentByPathInZip(
      setingsZipPath, 'resources/device-features.json',
      path.join(cusDir, 'device-features.json'), true);
  }

  function validateOperatorVariant() {
    var zipPath = path.join(process.cwd(), 'profile',
      'webapps', 'operatorvariant.gaiamobile.org', 'application.zip');
    var variantConfig = {
        'wallpaper':'/resources/wallpaper-7b8d66705b283f474c5892e70ece5890df7f9be2.json',
        'default_contacts':'/resources/mobizilla_contacts.json',
        'support_contacts':'/resources/mobizilla_support_contacts.json',
        'keyboard_settings':'/resources/keyboard-88cf36fbc274369ce1c2bea24dffce3017cc6f69.json',
        'network_type':'/resources/mobizilla_network_type.json',
        'known_networks':'/resources/mobizilla_known_networks.json',
        'nfc':'/resources/nfc-93c047a6d0389e755cacdbd6bb0986fff0576aee.json',
        'sms':'/resources/mobizilla_sms.json',
        'ringtone':'/resources/ringtone-8261e854cb494bf7f3a2a25510e595931244292a.json',
        'power':'/resources/power-0ccc24f04b44aaadc8962735b5f86eabc5bb71e6.json',
        'data_ftu':true,
        'search': '/resources/mobizilla_search.json',
        'topsites':'/resources/mobizilla_topsites.json',
        'browser': '/resources/mobizilla_bookmarks.json'
    };
    var expectedCustom = {
      '310-260': variantConfig,
      '311-261': variantConfig
    };

    helper.checkFileContentInZip(zipPath, 'resources/customization.json',
      expectedCustom, true);
    helper.checkFileInZip(zipPath,
      'resources/wallpaper-7b8d66705b283f474c5892e70ece5890df7f9be2.json',
      path.join(cusDir, 'mobizilla',
        'mobizilla_expected_wallpaper.json'));
    helper.checkFileInZip(zipPath,
      'resources/mobizilla_contacts.json',
      path.join(cusDir, 'mobizilla',
        'mobizilla_contacts.json'));
    helper.checkFileInZip(zipPath,
      'resources/mobizilla_support_contacts.json',
      path.join(cusDir, 'mobizilla',
        'mobizilla_support_contacts.json'));
    helper.checkFileInZip(zipPath,
      'resources/keyboard-88cf36fbc274369ce1c2bea24dffce3017cc6f69.json',
      path.join(cusDir, 'mobizilla',
        'mobizilla_expected_keyboard.json'));
    helper.checkFileInZip(zipPath,
      'resources/mobizilla_network_type.json',
      path.join(cusDir, 'mobizilla',
        'mobizilla_network_type.json'));
    helper.checkFileInZip(zipPath,
      'resources/mobizilla_known_networks.json',
      path.join(cusDir, 'mobizilla',
        'mobizilla_known_networks.json'));
    helper.checkFileInZip(zipPath,
      'resources/nfc-93c047a6d0389e755cacdbd6bb0986fff0576aee.json',
      path.join(cusDir, 'mobizilla',
        'mobizilla_expected_nfc.json'));
    helper.checkFileInZip(zipPath,
      'resources/mobizilla_sms.json',
      path.join(cusDir, 'mobizilla',
        'mobizilla_sms.json'));
    helper.checkFileInZip(zipPath,
      'resources/ringtone-8261e854cb494bf7f3a2a25510e595931244292a.json',
      path.join(cusDir, 'mobizilla',
        'mobizilla_expected_ringtone.json'));
    helper.checkFileInZip(zipPath,
      'resources/power-0ccc24f04b44aaadc8962735b5f86eabc5bb71e6.json',
      path.join(cusDir, 'mobizilla',
        'mobizilla_expected_power.json'));
    helper.checkFileInZip(zipPath,
      'resources/mobizilla_search.json',
      path.join(cusDir, 'mobizilla',
        'mobizilla_expected_search.json'));
    helper.checkFileInZip(zipPath,
      'resources/mobizilla_topsites.json',
      path.join(cusDir, 'mobizilla',
        'mobizilla_expected_topsites.json'));
    helper.checkFileInZip(zipPath,
      'resources/mobizilla_bookmarks.json',
      path.join(cusDir, 'mobizilla',
        'mobizilla_expected_bookmarks.json'));
  }

  function validateWappush() {
    var wappushZipPath = path.join(process.cwd(), 'profile',
      'webapps', 'wappush.gaiamobile.org', 'application.zip');

    helper.checkFileContentByPathInZip(wappushZipPath, 'js/whitelist.json',
      path.join(cusDir, 'wappush-whitelist.json'), true);
  }

  function validateWallpaper() {
    var zipPath = path.join(process.cwd(), 'profile',
      'webapps', 'wallpaper.gaiamobile.org', 'application.zip');
    helper.checkFileContentByPathInZip(zipPath, 'resources/list.json',
      path.join(cusDir, 'wallpapers', 'list.json'), true);

    helper.checkFileContentByPathInZip(zipPath,
      'resources/customize.png',
      path.join(cusDir, 'wallpapers', 'customize.png'), false);
  }

  function validateSystem() {
    var sysZipPath = path.join(process.cwd(), 'profile',
          'webapps', 'system.gaiamobile.org', 'application.zip');
    helper.checkFileContentByPathInZip(sysZipPath, 'resources/icc.json',
      path.join(cusDir, 'icc.json'), true);
    helper.checkFileContentByPathInZip(sysZipPath, 'resources/wapuaprof.json',
      path.join(cusDir, 'wapuaprof.json'), true);
    helper.checkFileContentByPathInZip(sysZipPath,
      'resources/power/carrie_power_on.png',
      path.join(cusDir, 'power', 'carrie_power_on.png'), false);
  }

  function validateUuid() {
    var uuidMapping = JSON.parse(fs.readFileSync(
      path.join(process.cwd(), 'customization','uuid.json')
    ));
    var webappsPath = path.join(process.cwd(), 'profile', 'webapps');

    for (let appname in uuidMapping) {
      assert.ok(
        fs.existsSync(path.join(webappsPath, uuidMapping[appname])),
        'uuid for directory name in profile/webapps should exists, app name: ' +
        appname + ', uuid: ' + uuidMapping[appname]
      );
    }
  }

  function parseCustimizeImageSetting(appConfig) {
    if (typeof appConfig !== 'object') {
      return '';
    }
    var expectedContent =
      '//\n' +
      '// This file is automatically generated: DO NOT EDIT.\n' +
      '//\n'+
      '// The default value of these variables depends on the\n'+
      '// GAIA_MEMORY_PROFILE environment variable. Set\n'+
      '// GAIA_MEMORY_PROFILE=low when building Gaia to get default\n'+
      '// values suitable for low-memory devices.\n'+
      '//\n'+
      '// To customize these values, create a gallery.json file in the\n' +
      '// distribution directory with content like this:\n' +    '//\n' +
      '//   {\n' +
      '//     "maxImagePixelSize": 6000000,\n' +
      '//     "maxSnapshotPixelSize": 4000000,\n' +
      '//     "maxPickPixelSize": 480000,\n' +
      '//     "maxEditPixelSize": 480000 }\n' +
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
        appConfig.maxSnapshotPixelSize + ';\n' +
      'var CONFIG_MAX_PICK_PIXEL_SIZE = ' +
        appConfig.maxPickPixelSize + ';\n' +
      'var CONFIG_MAX_EDIT_PIXEL_SIZE = ' +
        appConfig.maxEditPixelSize + ';\n';

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
    return expectedContent;
  }

  function validateGallery() {
    var cusPath = path.join(cusDir, 'gallery.json');
    var cusConfig = JSON.parse(fs.readFileSync(cusPath));
    var appZip = new AdmZip(path.join(process.cwd(), 'profile',
      'webapps', 'gallery.gaiamobile.org', 'application.zip'));
    var presetsContent = appZip.readAsText(appZip.getEntry('js/config.js'));

    var expectContent = parseCustimizeImageSetting(cusConfig);
    assert.equal(presetsContent,  expectContent);
  }

  function validateHomescreen() {
    var appZip = new AdmZip(path.join(process.cwd(), 'profile',
      'webapps', 'verticalhome.gaiamobile.org', 'application.zip'));
    var config = JSON.parse(appZip.readAsText(appZip.getEntry('js/init.json')));

    assert.equal(config.grid[0][0].name, 'Camera');
    assert.equal(config.grid[0][1].entry_point, 'dialer');
    assert.equal(config.grid[0][2].name, 'Messages');
    assert.equal(config.grid[0][3].name, 'Marketplace');

    // Collections
    assert.equal(config.grid[1][0].id, 289); // social
    assert.equal(config.grid[1][1].id, 207); // games
    assert.equal(config.grid[1][2].id, 142); // music

    assert.equal(config.grid[2][0].name, 'Gallery');

    assert.isTrue(fs.existsSync(path.join(process.cwd(), 'profile',
      'svoperapps', 'Twitter')),
      'profile/svoperapps/Twitter directory should exist');
    assert.isTrue(fs.existsSync(path.join(process.cwd(), 'profile',
      'svoperapps', 'Twitter', 'manifest.webapp')),
      'manifest for Twitter should exist');
  }

  function validateVariantSettings() {
    var expected = {
      '310-260': ['Twitter'],
      '311-261': ['Twitter']
    };
    var configPath = path.join(process.cwd(), 'profile', 'svoperapps',
      'singlevariantconf.json');
    var config = fs.readFileSync(configPath, {encoding: 'utf8'});
    assert.deepEqual(JSON.parse(config), expected);
  }

  test('build with GAIA_DISTRIBUTION_DIR', function(done) {
    cusDir = path.join(process.cwd(), 'customization');
    var cmd = 'GAIA_DISTRIBUTION_DIR=' + cusDir + ' make';
    helper.exec(cmd, function(error, stdout, stderr) {
      helper.checkError(error, stdout, stderr);
      validatePreloadSettingDB();
      validateSettings();
      validateOperatorVariant();
      validateWappush();
      validateSystem();
      validateGallery();
      validateHomescreen();
      validateWallpaper();
      validateVariantSettings();
      validateUuid();
      done();
    });
  });

  teardown(function() {
    rmrf('profile');
    rmrf('build_stage');

    // Close server and restore file to original.
    server.close();
    fs.writeFileSync(variantPath, originalVariant);
  });
});
