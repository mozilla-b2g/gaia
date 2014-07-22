'use strict';

var assert = require('chai').assert;
var proxyquire = require('proxyquire');
var mockUtils =
  require('./mock_utils.js');

suite('settings.js', function() {
  var app;
  setup(function() {
    app = proxyquire.noCallThru().load(
            '../../settings', {
              './utils': mockUtils
            });
    mockUtils.getFileContent = function(file) {
      return file;
    };
    mockUtils.getFileAsDataURI = function(file) {
      return file.path;
    };
  });
  suite('setWallpaper, setRingtone, setNotification, overrideSettings, ' +
        'setHomescreenURL and writeSettings',
    function() {
    var config;
    var settings = {};
    var jpgLink;
    setup(function() {
      config = {
        GAIA_DISTRIBUTION_DIR: 'testDistributionDir',
        GAIA_DIR: 'testGaia',
        SETTINGS_PATH: 'testSettingsPath',
        STAGE_DIR: 'testStageDir'
      };
      mockUtils.resolve = function(file, baseLink) {
        var fileExist = false;
        if (file === jpgLink && baseLink === config.GAIA_DIR) {
          fileExist = true;
        }
        return {
          exists: function() {
            return fileExist;
          },
          path: baseLink + '/' + file
        };
      };
    });

    test('setWallpaper, GAIA_DEV_PIXELS_PER_PX is not 1 and use default.jpg',
      function () {
      config.GAIA_DEV_PIXELS_PER_PX = '3';
      jpgLink = config.GAIA_DISTRIBUTION_DIR + '/wallpapers/default@' +
                    config.GAIA_DEV_PIXELS_PER_PX + 'x.jpg';

      app.setWallpaper(settings, config);
      assert.equal(settings['wallpaper.image'], config.GAIA_DIR + '/' +
        jpgLink);
    });

    test('setWallpaper, when GAIA_DEV_PIXELS_PER_PX is 1 and use default.jpg',
      function () {
      config.GAIA_DEV_PIXELS_PER_PX = '1';
      jpgLink = config.GAIA_DISTRIBUTION_DIR + '/wallpapers/default.jpg';

      app.setWallpaper(settings, config);
      assert.equal(settings['wallpaper.image'], config.GAIA_DIR + '/' +
        jpgLink);
    });

    test('setWallpaper, when GAIA_DEV_PIXELS_PER_PX is 1 and use wallpaper.jpg',
      function () {
      config.GAIA_DEV_PIXELS_PER_PX = '1';
      jpgLink = 'build/config/wallpaper.jpg';

      app.setWallpaper(settings, config);
      assert.equal(settings['wallpaper.image'], config.GAIA_DIR + '/' +
        jpgLink);
    });

    test('setWallpaper, GAIA_DEV_PIXELS_PER_PX is null and use wallpaper.jpg',
      function () {
      config.GAIA_DEV_PIXELS_PER_PX = '';
      jpgLink = 'build/config/wallpaper.jpg';

      app.setWallpaper(settings, config);
      assert.equal(settings['wallpaper.image'], config.GAIA_DIR + '/' +
        jpgLink);
    });

    test('setMediatone', function () {
      var mediatoneLink =
        'shared/resources/media/notifications/' +
        'notifier_bop.opus';
      app.setMediatone(settings, config);
      assert.equal(settings['media.ringtone'], config.GAIA_DIR + '/' +
        mediatoneLink);
    });

    test('setAlarmtone', function () {
      var alarmtoneLink =
        'shared/resources/media/alarms/' +
        'ac_classic_clock_alarm.opus';
      app.setAlarmtone(settings, config);
      assert.equal(settings['alarm.ringtone'], config.GAIA_DIR + '/' +
        alarmtoneLink);
    });

    test('setRingtone', function () {
      var ringtoneLink =
        'shared/resources/media/ringtones/' +
        'ringer_firefox.opus';
      app.setRingtone(settings, config);
      assert.equal(settings['dialer.ringtone'], config.GAIA_DIR + '/' +
        ringtoneLink);
      assert.deepEqual(settings['dialer.ringtone.name'],
                       {l10nID: 'ringer_firefox'});
      assert.equal(settings['dialer.ringtone.id'],
                   'builtin:ringer_firefox');
      assert.equal(settings['dialer.ringtone.default.id'],
                   'builtin:ringer_firefox');
    });

    test('setNotification', function () {
      var notificationLink =
        'shared/resources/media/notifications/' +
        'notifier_firefox.opus';
      mockUtils.resolve = function(file, baseLink) {
        return {
          path: baseLink + '/' + file
        };
      };
      app.setNotification(settings, config);
      assert.equal(settings['notification.ringtone'],
        config.GAIA_DIR + '/' + notificationLink);
      assert.deepEqual(settings['notification.ringtone.name'],
                       {l10nID: 'notifier_firefox'});
      assert.equal(settings['notification.ringtone.id'],
                   'builtin:notifier_firefox');
      assert.equal(settings['notification.ringtone.default.id'],
                   'builtin:notifier_firefox');
    });

    test('overrideSettings', function () {
      var testResult = {
        'testConfig': ''
      };
      mockUtils.resolve = function(file, baseLink) {
        testResult.testConfig = baseLink + '/' + file;
        return {
          path: testResult.testConfig,
          exists: function() {
            if (file === config.SETTINGS_PATH &&
                baseLink === config.GAIA_DIR) {
              return true;
            }
            return false;
          }
        };
      };
      mockUtils.getJSON = function(json) {
        return testResult;
      };
      app.overrideSettings(settings, config);
      assert.equal(settings.testConfig,
        testResult.testConfig);
    });

    test('deviceTypeSettings', function () {
      var testResult = {
        'testConfig': 'abc'
      };
      mockUtils.getFile = function() {
        return {
          exists: function() {
            return true;
          }
        };
      };
      mockUtils.getJSON = function(json) {
        return testResult;
      };
      app.deviceTypeSettings(settings, config);
      assert.equal(settings.testConfig,
        testResult.testConfig);
    });

    test('writeSettings', function () {
      var settingsFile = {result: ''};
      var settings = { 'testKey': 'testValue' };
      mockUtils.getFile = function(dir, file) {
        return {
          path: dir + '/' + file
        };
      };
      mockUtils.writeContent = function(target, string) {
        if (target.path === config.STAGE_DIR + '/settings_stage.json') {
          settingsFile.result = string;
        }
      };
      app.writeSettings(settings, config);
      assert.deepEqual(JSON.parse(settingsFile.result),
        settings);
    });

    test('setHomescreenURL with default homescreen', function() {
      config.GAIA_SCHEME = 'app://';
      config.GAIA_DOMAIN = 'gaiamobile.com';
      config.GAIA_PORT = ':8080';
      var settings = {};
      var testResult = mockUtils.gaiaManifestURL('verticalhome',
                    config.GAIA_SCHEME, config.GAIA_DOMAIN, config.GAIA_PORT);
      app.setHomescreenURL(settings, config);
      assert.equal(settings['homescreen.manifestURL'], testResult);
    });

    test('setHomescreenURL with customizable', function() {
      config.GAIA_APPDIRS = 'verticalhome system sms';
      config.GAIA_SCHEME = 'app://';
      config.GAIA_DOMAIN = 'gaiamobile.com';
      config.GAIA_PORT = ':8080';
      var settings = { 'homescreen.appName': 'verticalhome' };
      var testResult = mockUtils.gaiaManifestURL('verticalhome',
                    config.GAIA_SCHEME, config.GAIA_DOMAIN, config.GAIA_PORT);
      app.setHomescreenURL(settings, config);
      assert.equal(settings['homescreen.manifestURL'], testResult);
    });
  });


  suite('execute', function() {
    var config;
    setup(function() {
      config = {
        GAIA_DISTRIBUTION_DIR: 'testDistributionDir',
        GAIA_DIR: 'testGaia',
        SETTINGS_PATH: 'testSettingsPath',
        GAIA_SCHEME: 'testScheme',
        GAIA_PORT: 9999,
        GAIA_DEFAULT_LOCALE: 'testLocale',
        REMOTE_DEBUGGER: true,
        GAIA_DOMAIN: 'testDomain'
      };
      mockUtils.getFileAsDataURI = function() {
        return undefined;
      };
      mockUtils.getFile = function() {
        return {
          exists: function() {
            return true;
          }
        };
      };
      mockUtils.getJSON = function(json) {
        return {};
      };
    });

    test('TARGET_BUILD_VARIANT != user', function(done) {
      config.TARGET_BUILD_VARIANT = 'notuser';
      var queue = app.execute(config);
      queue.done(function(result) {
        assert.deepEqual({
          'debug.console.enabled': true,
          'developer.menu.enabled': true,
          'homescreen.manifestURL': config.GAIA_SCHEME +
            'verticalhome.' + config.GAIA_DOMAIN + config.GAIA_PORT +
            '/manifest.webapp',
          'rocketbar.searchAppURL': config.GAIA_SCHEME + 'search.' +
            config.GAIA_DOMAIN + config.GAIA_PORT + '/index.html',
          'debugger.remote-mode': 'adb-only',
          'language.current': config.GAIA_DEFAULT_LOCALE,
          'wallpaper.image': undefined,
          'media.ringtone': undefined,
          'alarm.ringtone': undefined,
          'dialer.ringtone.name': {l10nID: 'ringer_firefox'},
          'dialer.ringtone.id': 'builtin:ringer_firefox',
          'dialer.ringtone.default.id': 'builtin:ringer_firefox',
          'dialer.ringtone': undefined,
          'notification.ringtone.name': {l10nID: 'notifier_firefox'},
          'notification.ringtone.id': 'builtin:notifier_firefox',
          'notification.ringtone.default.id': 'builtin:notifier_firefox',
          'notification.ringtone': undefined,
          'ftu.pingURL': config.FTU_PING_URL },
          result);
        done();
      });
    });

    test('NOFTU === 0', function(done) {
      config.NOFTU = '0';
      config.TARGET_BUILD_VARIANT = 'user';
      var queue = app.execute(config);
      queue.done(function(result) {
        assert.deepEqual({
          'homescreen.manifestURL': config.GAIA_SCHEME +
            'verticalhome.' + config.GAIA_DOMAIN + config.GAIA_PORT +
            '/manifest.webapp',
          'rocketbar.searchAppURL': config.GAIA_SCHEME + 'search.' +
            config.GAIA_DOMAIN + config.GAIA_PORT + '/index.html',
          'language.current': config.GAIA_DEFAULT_LOCALE,
          'debugger.remote-mode': 'adb-only',
          'ftu.manifestURL': config.GAIA_SCHEME +
            'ftu.' + config.GAIA_DOMAIN + config.GAIA_PORT +
            '/manifest.webapp',
          'wallpaper.image': undefined,
          'media.ringtone': undefined,
          'alarm.ringtone': undefined,
          'dialer.ringtone.name': {l10nID: 'ringer_firefox'},
          'dialer.ringtone.id': 'builtin:ringer_firefox',
          'dialer.ringtone.default.id': 'builtin:ringer_firefox',
          'dialer.ringtone': undefined,
          'notification.ringtone.name': {l10nID: 'notifier_firefox'},
          'notification.ringtone.id': 'builtin:notifier_firefox',
          'notification.ringtone.default.id': 'builtin:notifier_firefox',
          'notification.ringtone': undefined,
          'ftu.pingURL': config.FTU_PING_URL },
          result);
        done();
      });
    });

    test('PRODUCTION === 1', function(done) {
      config.PRODUCTION = '1';
      config.TARGET_BUILD_VARIANT = 'user';
      var queue = app.execute(config);
      queue.done(function(result) {
        assert.deepEqual({
          'homescreen.manifestURL': config.GAIA_SCHEME +
            'verticalhome.' + config.GAIA_DOMAIN + config.GAIA_PORT +
            '/manifest.webapp',
          'rocketbar.searchAppURL': config.GAIA_SCHEME + 'search.' +
            config.GAIA_DOMAIN + config.GAIA_PORT + '/index.html',
          'feedback.url': 'https://input.mozilla.org/api/v1/feedback/',
          'language.current': config.GAIA_DEFAULT_LOCALE,
          'debugger.remote-mode': 'disabled',
          'wallpaper.image': undefined,
          'media.ringtone': undefined,
          'alarm.ringtone': undefined,
          'dialer.ringtone.name': {l10nID: 'ringer_firefox'},
          'dialer.ringtone.id': 'builtin:ringer_firefox',
          'dialer.ringtone.default.id': 'builtin:ringer_firefox',
          'dialer.ringtone': undefined,
          'notification.ringtone.name': {l10nID: 'notifier_firefox'},
          'notification.ringtone.id': 'builtin:notifier_firefox',
          'notification.ringtone.default.id': 'builtin:notifier_firefox',
          'notification.ringtone': undefined,
          'ftu.pingURL': config.FTU_PING_URL },
          result);
        done();
      });
    });

    test('DEVICE_DEBUG === true', function(done) {
      config.DEVICE_DEBUG = true;
      config.NO_LOCK_SCREEN = '1';
      config.TARGET_BUILD_VARIANT = 'user';
      var queue = app.execute(config);
      queue.done(function(result) {
        assert.deepEqual({
          'homescreen.manifestURL': config.GAIA_SCHEME +
            'verticalhome.' + config.GAIA_DOMAIN + config.GAIA_PORT +
            '/manifest.webapp',
          'rocketbar.searchAppURL': config.GAIA_SCHEME + 'search.' +
            config.GAIA_DOMAIN + config.GAIA_PORT + '/index.html',
          'language.current': config.GAIA_DEFAULT_LOCALE,
          'debugger.remote-mode': 'adb-devtools',
          'screen.timeout': 0,
          'lockscreen.enabled': false,
          'lockscreen.locked': false,
          'wallpaper.image': undefined,
          'media.ringtone': undefined,
          'alarm.ringtone': undefined,
          'dialer.ringtone.name': {l10nID: 'ringer_firefox'},
          'dialer.ringtone.id': 'builtin:ringer_firefox',
          'dialer.ringtone.default.id': 'builtin:ringer_firefox',
          'dialer.ringtone': undefined,
          'notification.ringtone.name': {l10nID: 'notifier_firefox'},
          'notification.ringtone.id': 'builtin:notifier_firefox',
          'notification.ringtone.default.id': 'builtin:notifier_firefox',
          'notification.ringtone': undefined,
          'ftu.pingURL': config.FTU_PING_URL },
          result);
        done();
      });
    });

    teardown(function() {
      config = {};
    });
  });

  suite('setDefaultKeyboardLayouts', function() {
    var config;
    var settings = {};
    var defaultManifestURL = 'app://keyboard.gaiamobile.org/manifest.webapp';
    var expectedLayouts = {};
    expectedLayouts[defaultManifestURL] = {en: true, number: true};

    setup(function() {
      config = {
        GAIA_DISTRIBUTION_DIR: 'testDistributionDir',
        GAIA_DIR: 'testGaia',
        SETTINGS_PATH: 'testSettingsPath'
      };
      mockUtils.resolve = function(file, baseLink) {
        return {
          exists: function() {
            return true;
          },
          path: baseLink + '/' + file
        };
      };

      mockUtils.getJSON = function() {
        return {
          'layout': {
            'en-US': [
              {'layoutId': 'en', 'appManifestURL': defaultManifestURL}
            ],
            'zh-TW': [
              {'layoutId': 'zhuyin', 'appManifestURL': defaultManifestURL},
              {'layoutId': 'en', 'appManifestURL': defaultManifestURL}
            ]
          },
          'langIndependentLayouts':
            [{'layoutId': 'number', 'appManifestURL': defaultManifestURL}]
        };

      };
    });

    test('Set default keyboard layouts, lang = en-US', function() {
      app.setDefaultKeyboardLayouts('en-US', settings, config);
      assert.deepEqual(settings['keyboard.enabled-layouts'],
                       expectedLayouts);
    });

    test('Set default keyboard layouts, lang = zh-TW', function() {
      app.setDefaultKeyboardLayouts('zh-TW', settings, config);

      var expectedLayoutsChinese = {};
      expectedLayoutsChinese[defaultManifestURL] = {zhuyin: true, en: true,
        number: true};
        assert.deepEqual(settings['keyboard.enabled-layouts'],
                         expectedLayoutsChinese);
    });

    test('Fall back to default keyboard layouts as en, lang = de', function() {
      app.setDefaultKeyboardLayouts('de', settings, config);
      assert.deepEqual(settings['keyboard.enabled-layouts'],
                       expectedLayouts);
    });
  });
});
