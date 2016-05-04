'use strict';

/* jshint maxlen: 130 */

var assert = require('chai').assert;
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var helper = require('./helper');
var dive = require('diveSync');

const MAX_PROFILE_SIZE_MB = 65;
const MAX_PROFILE_SIZE = MAX_PROFILE_SIZE_MB * 1024 * 1024;
const REBUILD_TEST_FILE = path.join(
  process.cwd() + '/apps/system/rebuild_test.txt');
const WEBAPPS_DIR = path.join(process.cwd() + '/profile/apps');

suite('Make and remake tests', function() {
  suiteSetup(helper.cleanupWorkspace);
  teardown(function() {
    helper.cleanupWorkspace();
    cleanTestFiles();
  });

  var ignoredApps = getCustomizedBuildApp();

  function cleanTestFiles() {
    if (fs.existsSync(REBUILD_TEST_FILE)) {
      fs.unlinkSync(REBUILD_TEST_FILE);
    }
  }

  function getTimestamp(dirPath, filter) {
    var timestamp = {};
    dive(dirPath, { filter: filter }, function(err, file) {
      if (err) {
        throw err;
      }
      timestamp[file] = fs.statSync(file).mtime.getTime();
    });
    return timestamp;
  }

  function getWebapps() {
    var file = fs.readFileSync(
      WEBAPPS_DIR + '/webapps.json', { encoding: 'utf8' });
    return Object.keys(JSON.parse(file)).filter(function(app) {
      return (/\{.+\}/.test(app) === -1);
    });
  }

  function getCustomizedBuildApp() {
    var cwd = process.cwd();
    var apps = [];
    var filter = function(file, dir) {
      // There are other folders we could avoid but walking the node_modules
      // folder can be problematic when using pre-built caches (and it's slow).
      if (dir && (file.indexOf(cwd + '/node_modules') !== 0)) {
        return true;
      }
      var pattern = new RegExp(
          '(' + cwd + '/apps|' + cwd + '/dev_apps)\\S+/build/build.js$');
      return pattern.test(file);
    };
    dive(cwd, { filter: filter }, function(err, file) {
      if (err) {
        throw err;
      }
      apps.push(file.match(/(\S+)\/(\S+)\/build\/build\.js/)[2]);
    });
    apps.push('shared');
    return apps;
  }

  test('make without rule & variable', function(done) {
    helper.exec('make', function(error, stdout, stderr) {
      helper.checkError(error, stdout, stderr);

      // expected values for prefs and user_prefs
      var expectedUserPrefs = {
        'network.http.max-connections-per-server': 15,
        'dom.mozInputMethod.enabled': true,
        'ril.debugging.enabled': false,
        'dom.mms.version': 17,
        'b2g.wifi.allow_unsafe_wpa_eap': true
      };
      var expectedPrefs = {
        'geo.gps.supl_server': 'supl.izatcloud.net',
        'geo.gps.supl_port': 22024,
        'dom.payment.provider.0.name': 'firefoxmarket',
        'dom.payment.provider.0.description': 'marketplace.firefox.com',
        'dom.payment.provider.0.uri': 'https://marketplace.firefox.com/mozpay/?req=',
        'dom.payment.provider.0.type': 'mozilla/payments/pay/v1',
        'dom.payment.provider.0.requestMethod': 'GET',
        'dom.payment.skipHTTPSCheck': true,
        'dom.payment.debug': true,
        'dom.payment.provider.1.name': 'firefoxmarketdev',
        'dom.payment.provider.1.description': 'marketplace-dev.allizom.org',
        'dom.payment.provider.1.uri': 'https://marketplace-dev.allizom.org/mozpay/?req=',
        'dom.payment.provider.1.type': 'mozilla-dev/payments/pay/v1',
        'dom.payment.provider.1.requestMethod': 'GET',
        'dom.payment.provider.2.name': 'firefoxmarketstage',
        'dom.payment.provider.2.description': 'marketplace.allizom.org',
        'dom.payment.provider.2.uri': 'https://marketplace.allizom.org/mozpay/?req=',
        'dom.payment.provider.2.type': 'mozilla-stage/payments/pay/v1',
        'dom.payment.provider.2.requestMethod': 'GET',
        'dom.payment.provider.3.name': 'mockpayprovider',
        'dom.payment.provider.3.description': 'Mock Payment Provider',
        'dom.payment.provider.3.uri': 'http://ferjm.github.io/gaia-mock-payment-provider/index.html?req=',
        'dom.payment.provider.3.type': 'tests/payments/pay/v1',
        'dom.payment.provider.3.requestMethod': 'GET'
      };

      // expected values for settings.json from build/config/common-settings.json
      var settingsPath = path.join(process.cwd(), 'profile', 'settings.json');
      var commonSettingsPath = path.join(process.cwd(), 'build', 'config',
        'common-settings.json');
      var settings = JSON.parse(fs.readFileSync(settingsPath));
      var commonSettings = JSON.parse(fs.readFileSync(commonSettingsPath));

      // we change these settings values in build/settings.js if
      // TARGET_BUILD_VARIANT is not 'user'
      var ignoreSettings = [
        'apz.force-enable',
        'debug.console.enabled',
        'developer.menu.enabled'
      ];
      ignoreSettings.forEach(function(key) {
        if (commonSettings[key] !== undefined) {
          delete commonSettings[key];
        }
      });

      // path in zip for unofficial branding
      // FIXME: Broken because of Bug 1268477
      // var pathInFolder = 'shared/resources/branding/initlogo.png';
      // zip path for system app
      // var folderPath = path.join(process.cwd(), 'profile', 'apps', 'system');
      // expected branding file, it should be a unofficial branding if we
      // execute |make| without rule and variable.
      // var expectedBrandingPath = path.join(folderPath, '..', 'shared',
      //    'resources', 'branding', 'unofficial', 'initlogo.png');

      // Read user.js and use vm module to execute javascript in user.js
      var userjs = fs.readFileSync(
        path.join('profile', 'user.js'),
        { encoding: 'utf8' }
      );
      var sandbox = helper.getPrefsSandbox();
      vm.runInNewContext(userjs, sandbox);

      var webapps = JSON.parse(fs.readFileSync(path.join(process.cwd(),
        'profile', 'apps', 'webapps.json')));

      helper.checkSettings(settings, commonSettings);
      helper.checkPrefs(sandbox.userPrefs, expectedUserPrefs);
      helper.checkPrefs(sandbox.prefs, expectedPrefs);
      helper.checkWebappsScheme(webapps);
      // FIXME: Broken because of Bug 1268477
      // helper.checkFileInFolder(folderPath,pathInFolder,expectedBrandingPath);

      var profileSize = 0;
      dive(path.join(process.cwd(), 'profile'), function(err, file) {
        if (err) {
          throw err;
        }
        profileSize += fs.statSync(file).size;
      });
      assert(profileSize < MAX_PROFILE_SIZE,
        'profile size should be less than ' + MAX_PROFILE_SIZE_MB +
        'MB, current is ' + (profileSize / 1024 / 1024).toFixed(2) + 'MB');
      done();
    });
  });

  test('make twice without modifying anything', function(done) {
    var previousOtherAppsTime;
    var currentOtherAppsTime;
    var previousUUIDAppsTime;
    var currentUUIDAppsTime;
    var previousWebapps;
    var currentWebapps;
    var options = {
      maxBuffer: 400 * 1024,
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME
      }
    };

    var filterOtherApps = function(file, dir) {
      if (dir) {
        return true;
      }
      var hasCustomizedBuild = ignoredApps.some(function(domain) {
        return file.indexOf(domain) !== -1;
      });
      return !hasCustomizedBuild && !/(\{.+\}|webapps\.json)/.test(file);
    };

    var filterUUIDApps = function(file, dir) {
      if (dir) {
        return true;
      }
      return /\{.+\}/.test(file);
    };

    helper.exec('make', options, function(error, stdout, stderr) {
      helper.checkError(error, stdout, stderr);
      previousOtherAppsTime = getTimestamp(WEBAPPS_DIR, filterOtherApps);
      previousUUIDAppsTime = getTimestamp(WEBAPPS_DIR, filterUUIDApps);
      previousWebapps = getWebapps();

      helper.exec('make', options, function(error, stdout, stderr) {
        var webapps = JSON.parse(fs.readFileSync(path.join(process.cwd(),
          'profile', 'apps', 'webapps.json')));
        helper.checkError(error, stdout, stderr);
        helper.checkWebappsScheme(webapps);
        currentOtherAppsTime = getTimestamp(WEBAPPS_DIR, filterOtherApps);
        currentUUIDAppsTime = getTimestamp(WEBAPPS_DIR, filterUUIDApps);
        currentWebapps = getWebapps();
        assert.deepEqual(previousOtherAppsTime, currentOtherAppsTime);
        assert.sameMembers(previousWebapps, currentWebapps);
        assert.equal(Object.keys(previousUUIDAppsTime).length,
          Object.keys(currentUUIDAppsTime).length);
        done();
      });
    });
  });

  test('make twice with adding a file', function(done) {
    var previousSystemTime;
    var currentSystemTime;
    var previousOtherAppsTime;
    var currentOtherAppsTime;
    var previousWebapps;
    var currentWebapps;
    var options = {
      maxBuffer: 400 * 1024,
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME
      }
    };

    var systemAppfilter = function(file, dir) {
      if (dir) {
        return true;
      }
      return (file.indexOf('system') !== -1);
    };

    var otherAppsFilter = function(file, dir) {
      if (dir) {
        return true;
      }
      var hasCustomizedBuild = ignoredApps.some(function(domain) {
        return file.indexOf(domain) !== -1;
      });
      return !hasCustomizedBuild &&
        /(\{.+\}|system|webapps\.json)/.test(file) === false;
    };

    helper.exec('make', options, function(error, stdout, stderr) {
      helper.checkError(error, stdout, stderr);
      previousSystemTime = getTimestamp(WEBAPPS_DIR, systemAppfilter);
      previousOtherAppsTime = getTimestamp(WEBAPPS_DIR, otherAppsFilter);
      previousWebapps = getWebapps();
      fs.writeFileSync(REBUILD_TEST_FILE, 'test');

      helper.exec('make', options, function(error, stdout, stderr) {
        var webapps = JSON.parse(fs.readFileSync(path.join(process.cwd(),
          'profile', 'apps', 'webapps.json')));
        helper.checkError(error, stdout, stderr);
        helper.checkWebappsScheme(webapps);
        currentSystemTime = getTimestamp(WEBAPPS_DIR, systemAppfilter);
        currentOtherAppsTime = getTimestamp(WEBAPPS_DIR, otherAppsFilter);
        currentWebapps = getWebapps();
        assert.notDeepEqual(previousSystemTime, currentSystemTime);
        assert.deepEqual(previousOtherAppsTime, currentOtherAppsTime);
        assert.sameMembers(previousWebapps, currentWebapps);
        done();
      });
    });
  });
});
