'use strict';

var assert = require('chai').assert;
var proxyquire = require('proxyquire');
var mockUtils = require('./mock_utils.js');

suite('preferences.js', function() {
  var app;
  var preferences;
  var fileContent;
  var servicePrefs = {};
  setup(function() {
    app = proxyquire.noCallThru().load(
            '../../preferences', {
              './utils': mockUtils
            });
    mockUtils.gaia = {
      getInstance: function(config) {
        return config;
      }
    };
    mockUtils.getFile = function() {
      return {
        path: Array.prototype.join.call(arguments, '/'),
        exists: function() {
          return true;
        },
        clone: function() {
          return {
            append: function() {},
            exists: function() { return true; }
          };
        },
      };
    };
    mockUtils.getFileContent = function(file) {
      return file.path;
    };
    mockUtils.getFileURISpec = function(file) {
      return file.path;
    };
    mockUtils.writeContent = function(file, content) {
      fileContent = {
        file: file.path,
        content: content
      };
      return fileContent;
    };
    mockUtils.getLocaleBasedir = function(dir) {
      return dir;
    };
    mockUtils.Services = {
      prefs: {
        setCharPref: function(key, val) {
          servicePrefs[key] = {
            value: val,
            type: 'char'
          };
        },
        setBoolPref: function(key, val) {
          servicePrefs[key] = {
            value: val,
            type: 'bool'
          };
        },
        setIntPref: function(key, val) {
          servicePrefs[key] = {
            value: val,
            type: 'int'
          };
        }
      }
    };
  });

  suite('setConfig, execute, writePref, setPrefs, loadPrefFile, ' +
        'customizePrefValue', function() {
    var config;
    setup(function() {
      preferences = new app.PreferencesBuilder();
      config = {
        PROFILE_DIR: 'testProfileDir'
      };
    });

    test('setConfig', function () {
      preferences.setConfig(config);

      assert.deepEqual(preferences.config, config);
      assert.deepEqual(preferences.prefs, {});
      assert.deepEqual(preferences.gaia, config);
      assert.deepEqual(preferences.extenedPrefFiles,
        ['custom-prefs.js', 'gps-prefs.js', 'payment-prefs.js'],
        'extenedPrefFiles should contain three *-prefs.js');
    });

    test('setConfig with DEBUG=1', function () {
      config.DEBUG = '1';
      preferences.setConfig(config);
      assert.ok(preferences.extenedPrefFiles.indexOf('debug-prefs.js') !== -1,
        'extenedPrefFiles should contain debug-prefs.js');
    });

    test('setConfig with GAIA_APP_TARGET=engineering', function () {
      config.GAIA_APP_TARGET = 'engineering';
      preferences.setConfig(config);
      assert.ok(
        preferences.extenedPrefFiles.indexOf('payment-dev-prefs.js') !== -1,
        'extenedPrefFiles should contain payment-dev-prefs.js'
      );
    });

    test('setConfig with GAIA_APP_TARGET=dogfood', function () {
      config.GAIA_APP_TARGET = 'dogfood';
      preferences.setConfig(config);
      assert.ok(
        preferences.extenedPrefFiles.indexOf('dogfood-prefs.js') !== -1,
        'extenedPrefFiles should contain dogfood-prefs.js'
      );
    });

    test('execute', function () {
      var result;
      preferences.preparePref = function() {};
      preferences.writePrefs = function() {result = 'xpcshell';};
      preferences.setPrefs = function() {result = 'b2g';};
      preferences.execute({engine: 'xpcshell'});
      assert.equal(result, 'xpcshell');
      preferences.execute({engine: 'b2g'});
      assert.equal(result, 'b2g');
    });

    test('writePrefs', function () {
      preferences.config = {
        PROFILE_DIR: 'testProfileDir'
      };
      preferences.prefs = {
        'testKey': 'testContent'
      };
      preferences.userPrefs = {
        'testKey2': 'testContent2'
      };
      preferences.writePrefs(preferences.config.PROFILE_DIR + 'user.js',
        preferences.prefs, preferences.userPrefs
      );
      assert.deepEqual(fileContent, {
        file: preferences.config.PROFILE_DIR + 'user.js',
        content: 'pref(\'' + 'testKey' + '\', ' +
          JSON.stringify('testContent') + ');\n' +
                 'user_pref(\'' + 'testKey2' + '\', ' +
          JSON.stringify('testContent2') + ');\n' + '\n'
      });
    });

    test('setPrefs', function () {
      preferences.prefs = {
        string: 'abc',
        bool: true,
        num: 3
      };
      preferences.setPrefs();
      assert.deepEqual(servicePrefs, {
        'string': {
          value: 'abc',
          type: 'char'
        },
        'bool': {
          value: true,
          type: 'bool'
        },
        'num': {
          value: 3,
          type: 'int'
        }
      });
    });

    test('loadPrefFile', function() {
      preferences.prefs = {};
      preferences.userPrefs = {};
      var callingCount = 0;
      var oldLoader = mockUtils.scriptLoader.load;
      mockUtils.scriptLoader.load = function(path, exportObj, withoutCache) {
        assert.isDefined(path);
        assert.isDefined(exportObj);
        callingCount++;
        exportObj.pref('test-string-key-' + callingCount, path);
        exportObj.pref('test-boolean-key-' + callingCount, true);
        exportObj.pref('test-integer-key-' + callingCount, 1);
        exportObj.user_pref('test-user-string-key-' + callingCount,
                            'test user value');
        exportObj.user_pref('test-user-boolean-key-' + callingCount, false);
        exportObj.user_pref('test-user-integer-key-' + callingCount, 2);
      };

      var prefsList = ['prefs-a', 'prefs-b', 'prefs-c'];
      var exists = function() { return true; };
      var srcDir = {
        path: 'build/config',
        exists: exists,
        clone: function() {
          var path = 'build/config';
          return {
            path: path,
            exists: exists,
            append: function(filename) {
              this.path += '/' + filename;
            }
          };
        }
      };
      preferences.loadPrefFile(srcDir, prefsList);
      assert.equal(callingCount, 3);
      assert.deepEqual(preferences.prefs, {
        'test-string-key-1': 'build/config/prefs-a',
        'test-boolean-key-1': true,
        'test-integer-key-1': 1,
        'test-string-key-2': 'build/config/prefs-b',
        'test-boolean-key-2': true,
        'test-integer-key-2': 1,
        'test-string-key-3': 'build/config/prefs-c',
        'test-boolean-key-3': true,
        'test-integer-key-3': 1
      });
      assert.deepEqual(preferences.userPrefs, {
        'test-user-string-key-1': 'test user value',
        'test-user-boolean-key-1': false,
        'test-user-integer-key-1': 2,
        'test-user-string-key-2': 'test user value',
        'test-user-boolean-key-2': false,
        'test-user-integer-key-2': 2,
        'test-user-string-key-3': 'test user value',
        'test-user-boolean-key-3': false,
        'test-user-integer-key-3': 2
      });
      mockUtils.scriptLoader.load = oldLoader;
    });

    test('customizePrefValue', function() {
      // responsive UI
      var value = preferences.customizePrefValue(
                                        'devtools.responsiveUI.customWidth', 0);
      assert.equal(value, 32);
      value = preferences.customizePrefValue(
                                       'devtools.responsiveUI.customHeight', 0);
      assert.equal(value, 61);
      value = preferences.customizePrefValue('other-integer-pref', 0);
      assert.equal(value, 0);
      value = preferences.customizePrefValue('other-boolean-pref', true);
      assert.isTrue(value);
      value = preferences.customizePrefValue('other-string-pref', 'test');
      assert.equal(value, 'test');
    });

    teardown(function() {
      config = null;
      preferences = null;
      fileContent = null;
      servicePrefs = {};
    });
  });

  suite('editLocalDomainPref, editDesktopPref, editDebugPref, ' +
        'editDeviceDebugPref', function() {
    var config;
    setup(function() {
      preferences = new app.PreferencesBuilder();
    });

    test('editLocalDomainPref', function () {
      preferences.domains = ['test1', 'test2'];
      preferences.prefs = {};
      preferences.userPrefs = {};
      preferences.setLocalDomainPref();

      assert.deepEqual(preferences.userPrefs, {
        'network.dns.localDomains': preferences.domains.join(',')
      });
    });

    test('editDesktopPref', function () {
      preferences.system = 'testSystem';
      preferences.prefs = {};
      preferences.userPrefs = {};
      preferences.setDesktopPref();
      assert.deepEqual(preferences.userPrefs, {
        'extensions.autoDisableScopes': 0
      });
    });

    test('editDebugPref', function () {
      preferences.homescreen = 'testHomescreen';
      preferences.config = {
        GAIA_DIR: 'testGaiaDir',
        GAIA_DOMAIN: 'testGaiaDomain',
        GAIA_PORT: ':8080',
        GAIA_APPDIRS: 'testAppDirs',
        GAIA_ALLAPPDIRS: 'testAppDir1 testAppDir2',
        GAIA_LOCALES_PATH: 'testLocalesPath',
        OFFICIAL: 1,
        LOCALES_FILE: 'testLocaleFile',
        LOCALE_BASEDIR: 'testLocaleBaseDir',
        GAIA_DEV_PIXELS_PER_PX: 2
      };
      preferences.gaia = {
        webapps: [
          {
            sourceAppDirectoryName: 'testSourceName',
            sourceDirectoryName: 'testDirName'
          }
        ]
      };
      preferences.prefs = {};
      preferences.userPrefs = {};
      preferences.setDebugPref();
      assert.deepEqual(preferences.userPrefs, {
        'docshell.device_size_is_page_size': true,
        'marionette.defaultPrefs.enabled': true,
        'nglayout.debug.disable_xul_cache': true,
        'nglayout.debug.disable_xul_fastload': true,
        'javascript.options.showInConsole': true,
        'browser.dom.window.dump.enabled': true,
        'dom.report_all_js_exceptions': true,
        'dom.w3c_touch_events.enabled': 1,
        'dom.promise.enabled': true,
        'dom.wakelock.enabled': true,
        'image.mozsamplesize.enabled': true,
        'webgl.verbose': true,
        'dom.max_script_run_time': 0,
        'toolkit.identity.debug': true,
        'extensions.gaia.dir': preferences.config.GAIA_DIR,
        'extensions.gaia.domain': preferences.config.GAIA_DOMAIN,
        'extensions.gaia.port': 8080,
        'extensions.gaia.appdirs': preferences.config.GAIA_APPDIRS,
        'extensions.gaia.allappdirs': preferences.config.GAIA_ALLAPPDIRS,
        'extensions.gaia.locales_debug_path':
          preferences.config.GAIA_LOCALES_PATH,
        'extensions.gaia.official': true,
        'extensions.gaia.locales_file': preferences.config.LOCALES_FILE,
        'extensions.gaia.locale_basedir': preferences.config.LOCALE_BASEDIR,
        'extensions.gaia.device_pixel_suffix':
          '@' + preferences.config.GAIA_DEV_PIXELS_PER_PX + 'x',
        'extensions.autoDisableScopes': 0,
        'browser.tabs.remote.autostart': false,
        'browser.tabs.remote.autostart.1': false,
        'browser.tabs.remote.autostart.2': false,
        'browser.shell.checkDefaultBrowser': false
      });
      assert.isUndefined(preferences.userPrefs['network.http.use-cache']);
    });

    test('editDeviceDebugPref', function () {
      preferences.prefs = {};
      preferences.userPrefs = {};
      preferences.setDeviceDebugPref();
      assert.deepEqual(preferences.userPrefs, {
        'devtools.debugger.prompt-connection': false,
        'devtools.debugger.forbid-certified-apps': false,
        'javascript.options.discardSystemSource': false,
        'b2g.adb.timeout': 0
      });
    });

    teardown(function() {
      config = null;
      preferences = null;
      fileContent = null;
    });
  });
  suite('preparePref', function() {
    var config;
    setup(function() {
      preferences = new app.PreferencesBuilder();
    });

    test('preparePref', function () {
      var cusPref;
      preferences.setLocalDomainPref = function() {
        cusPref = 'local';
      };
      preferences.setDesktopPref = function() {
        cusPref = 'desktop';
      };
      preferences.setDebugPref = function() {
        cusPref = 'debug';
      };
      preferences.setDeviceDebugPref = function() {
        cusPref = 'device';
      };

      preferences.gaia = {
        webapps: [
          { domain: 'testDomain' }
        ]
      };
      preferences.config = {
        SYSTEM: 'app://system',
        GAIA_PORT: '8000',
        GAIA_DOMAIN: 'domain',
        GAIA_ALLAPPDIRS: 'testAppDir1 testAppDir2'
      };

      preferences.prefs = {};
      preferences.userPrefs = {};
      preferences.preparePref();
      assert.deepEqual(preferences.userPrefs, {
        'b2g.system_manifest_url': 'app://system/manifest.webapp',
        'b2g.neterror.url': 'app://system/net_error.html',
        'b2g.system_startup_url': 'app://system/index.html',
        'network.http.max-connections-per-server': 15,
        'dom.mozInputMethod.enabled': true,
        'intl.uidirection.qps-plocm': 'rtl',
        'layout.css.scroll-behavior.enabled': true,
        'layout.css.sticky.enabled': true,
        'ril.debugging.enabled': false,
        'dom.mms.version': 0x11,
        'b2g.wifi.allow_unsafe_wpa_eap': true
      });
      preferences.config.LOCAL_DOMAINS = '1';
      preferences.preparePref();
      assert.equal(cusPref, 'local');
      delete preferences.config.LOCAL_DOMAINS;
      preferences.config.DESKTOP = '1';
      preferences.preparePref();
      assert.equal(cusPref, 'desktop');
      delete preferences.config.DESKTOP;
      preferences.config.DEBUG = '1';
      preferences.preparePref();
      assert.equal(cusPref, 'debug');
      delete preferences.config.DEBUG;
      preferences.config.DEVICE_DEBUG = '1';
      preferences.preparePref();
      assert.equal(cusPref, 'device');

    });

    teardown(function() {
      config = null;
      preferences = null;
    });
  });
});
