'use strict';

var assert = require('chai').assert;
var proxyquire = require('proxyquire');
var mockUtils =
  require('./mock_utils.js');

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
    mockUtils.getFile = function(src, path) {
      return src + path;
    };
    mockUtils.writeContent = function(file, content) {
      fileContent = {
        file: file,
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

  suite('setConfig, execute, writePref, setPrefs', function() {
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
    });

    test('execute', function () {
      var result;
      preferences.preparePref = function() {};
      preferences.writePref = function() {result = 'xpcshell';};
      preferences.setPrefs = function() {result = 'b2g';};
      preferences.execute({engine: 'xpcshell'});
      assert.equal(result, 'xpcshell');
      preferences.execute({engine: 'b2g'});
      assert.equal(result, 'b2g');
    });

    test('writePref', function () {
      preferences.config = {
        PROFILE_DIR: 'testProfileDir'
      };
      preferences.prefs = {
        'testKey': 'testContent'
      };
      preferences.writePref();
      assert.deepEqual(fileContent, {
        file: preferences.config.PROFILE_DIR + 'user.js',
        content: 'user_pref(\'' + 'testKey' + '\', ' +
          JSON.stringify('testContent') + ');\n' + '\n'
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
      preferences.setLocalDomainPref();

      assert.deepEqual(preferences.prefs, {
        'network.dns.localDomains': preferences.domains.join(',')
      });
    });

    test('editDesktopPref', function () {
      preferences.system = 'testSystem';
      preferences.prefs = {};
      preferences.setDesktopPref();
      assert.deepEqual(preferences.prefs, {
        'browser.startup.homepage': preferences.system,
        'startup.homepage_welcome_url': '',
        'browser.shell.checkDefaultBrowser': false,
        'devtools.toolbox.host': 'side',
        'devtools.toolbox.sidebar.width': 800,
        'devtools.toolbox.selectedTool': 'firefox-os-controls',
        'browser.sessionstore.max_tabs_undo': 0,
        'browser.sessionstore.max_windows_undo': 0,
        'browser.sessionstore.restore_on_demand': false,
        'browser.sessionstore.resume_from_crash': false,
        'dom.mozBrowserFramesEnabled': true,
        'b2g.ignoreXFrameOptions': true,
        'network.disable.ipc.security': true,
        'dom.ipc.tabs.disabled': true,
        'browser.ignoreNativeFrameTextSelection': true,
        'ui.dragThresholdX': 25,
        'dom.w3c_touch_events.enabled': 1,
        'dom.sms.enabled': true,
        'dom.mozTCPSocket.enabled': true,
        'notification.feature.enabled': true,
        'dom.sysmsg.enabled': true,
        'dom.mozAlarms.enabled': true,
        'device.storage.enabled': true,
        'device.storage.prompt.testing': true,
        'dom.datastore.enabled': true,
        'dom.testing.datastore_enabled_for_hosted_apps': true,
        'dom.inter-app-communication-api.enabled': true,
        'dom.mozSettings.enabled': true,
        'dom.navigator-property.disable.mozSettings': false,
        'dom.mozPermissionSettings.enabled': true,
        'dom.mozContacts.enabled': true,
        'dom.navigator-property.disable.mozContacts': false,
        'dom.global-constructor.disable.mozContact': false,
        'dom.experimental_forms': true,
        'dom.webapps.useCurrentProfile': true,
        'bluetooth.enabled': true,
        'bluetooth.visible': false,
        'wifi.enabled': true,
        'wifi.suspended': false,
        'font.default.x-western': 'sans-serif',
        'font.name.serif.x-western': 'Charis SIL Compact',
        'font.name.sans-serif.x-western': 'Fira Sans',
        'font.name.monospace.x-western': 'Source Code Pro',
        'font.name-list.sans-serif.x-western': 'Fira Sans, Roboto',
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
      preferences.setDebugPref();
      assert.deepEqual(preferences.prefs, {
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
        'network.http.use-cache': false,
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
        'extensions.autoDisableScopes': 0
      });
    });

    test('editDeviceDebugPref', function () {
      preferences.prefs = {};
      preferences.setDeviceDebugPref();
      assert.deepEqual(preferences.prefs, {
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
          {domain: 'testDomain'}
        ]
      };
      preferences.config = {
        SYSTEM: 'app://system',
        GAIA_PORT: 8000,
        GAIA_DOMAIN: 'domain',
        GAIA_ALLAPPDIRS: 'testAppDir1 testAppDir2'
      };

      preferences.prefs = {};
      preferences.preparePref();
      assert.deepEqual(preferences.prefs, {
        'b2g.system_manifest_url': 'app://system/manifest.webapp',
        'b2g.neterror.url': 'app://system/net_error.html',
        'b2g.system_startup_url': 'app://system/index.html',
        'network.http.max-connections-per-server': 15,
        'dom.mozInputMethod.enabled': true,
        'dom.webcomponents.enabled': true,
        'intl.uidirection.qps-plocm': 'rtl',
        'layout.css.sticky.enabled': true,
        'ril.debugging.enabled': false,
        'dom.mms.version': 0x11,
        'b2g.wifi.allow_unsafe_wpa_eap': true
      });
      preferences.config.LOCAL_DOMAINS = true;
      preferences.preparePref();
      assert.equal(cusPref, 'local');
      delete preferences.config.LOCAL_DOMAINS;
      preferences.config.DESKTOP = true;
      preferences.preparePref();
      assert.equal(cusPref, 'desktop');
      delete preferences.config.DESKTOP;
      preferences.config.DEBUG = true;
      preferences.preparePref();
      assert.equal(cusPref, 'debug');
      delete preferences.config.DEBUG;
      preferences.config.DEVICE_DEBUG = true;
      preferences.preparePref();
      assert.equal(cusPref, 'device');

    });

    teardown(function() {
      config = null;
      preferences = null;
    });
  });
});
