'use strict';

/* jshint maxlen: 130 */

var rmrf = require('rimraf').sync;
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

    helper.checkSettings(settings, expectedSettings);
  }

  function validateSettings() {
    var setingsFolderPath = path.join(process.cwd(), 'profile', 'apps',
                                      'settings');

    helper.checkFileContentByPathInFolder(
      setingsFolderPath, 'resources/support.json',
      path.join(cusDir, 'support.json'), true);

    helper.checkFileContentByPathInFolder(
      setingsFolderPath, 'resources/device-features.json',
      path.join(cusDir, 'device-features.json'), true);
  }

  /*
  function validateWappush() {
    var wappushZipPath = path.join(process.cwd(), 'profile',
      'webapps', 'wappush.gaiamobile.org', 'application.zip');

    helper.checkFileContentByPathInZip(wappushZipPath, 'js/whitelist.json',
      path.join(cusDir, 'wappush-whitelist.json'), true);
  }
  */

  function validateSystem() {
    var sysFolderPath = path.join(process.cwd(), 'profile', 'apps', 'system');
    helper.checkFileContentByPathInFolder(sysFolderPath, 'resources/icc.json',
      path.join(cusDir, 'icc.json'), true);
    helper.checkFileContentByPathInFolder(sysFolderPath,
      'resources/wapuaprof.json', path.join(cusDir, 'wapuaprof.json'), true);
    // FIXME: Broken because of Bug 1268477
    // helper.checkFileContentByPathInFolder(sysFolderPath,
    //   'resources/power/carrier_power_on.png',
    //   path.join(cusDir, 'power', 'carrier_power_on.png'), false);
  }

  function validateUuid() {
    var uuidMapping = JSON.parse(fs.readFileSync(
      path.join(process.cwd(), 'customization','uuid.json')
    ));
    var webappsPath = path.join(process.cwd(), 'profile', 'apps');

    for (let appname in uuidMapping) {
      assert.ok(
        fs.existsSync(path.join(webappsPath, uuidMapping[appname])),
        'uuid for directory name in profile/webapps should exists, app name: ' +
        appname + ', uuid: ' + uuidMapping[appname]
      );
    }
  }

  function validateHomescreen() {
    var appFolder = path.join(process.cwd(), 'profile', 'apps', 'homescreen');
    var entry = fs.readFileSync(path.join(appFolder, 'js/init.json'),
                                { encoding: 'utf-8' });
    var config = JSON.parse(entry);

    assert.equal(config.grid[1][0].name, 'Settings');

    // Those are disabled until we get back some apps.
    // confere Bug 1268808
    /*
    assert.equal(config.grid[0][0].name, 'Camera');
    assert.equal(config.grid[0][1].entry_point, 'dialer');
    assert.equal(config.grid[0][2].name, 'Messages');
    assert.equal(config.grid[0][3].name, 'Marketplace');

    assert.equal(config.grid[2][0].name, 'Calendar');

    assert.isTrue(fs.existsSync(path.join(process.cwd(), 'profile',
      'svoperapps', 'Twitter')),
      'profile/svoperapps/Twitter directory should exist');
    assert.isTrue(fs.existsSync(path.join(process.cwd(), 'profile',
      'svoperapps', 'Twitter', 'manifest.webapp')),
      'manifest for Twitter should exist');
    */
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
      // validateWappush(); // We will need it soon :)
      validateSystem();
      validateHomescreen();
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
