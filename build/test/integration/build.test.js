var exec = require('child_process').exec;
var assert = require('chai').assert;
var rmrf = require('rimraf').sync;
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var AdmZip = require('adm-zip');
var dive = require('dive');
var helper = require('./helper');

suite('ADB tests', function() {
  suiteSetup(function() {
    rmrf('build/test/integration/result');
  });

  suiteTeardown(function() {
    rmrf('build/test/integration/result');
  });

  test('make install-test-media', function(done) {
    var expectedCommand = 'push test_media/Pictures /sdcard/DCIM\n' +
                          'push test_media/Movies /sdcard/Movies\n' +
                          'push test_media/Music /sdcard/Music\n';

    exec('ADB=build/test/bin/fake-adb make install-test-media',
      function(error, stdout, stderr) {
        helper.checkError(error, stdout, stderr);
        var presetsContent = fs.readFileSync(path.join(process.cwd(), 'build',
            'test', 'integration', 'result'));
        assert.equal(presetsContent,  expectedCommand);
        done();
    });
  });
});

suite('Node modules tests', function() {
  test('make node_modules from git mirror', function(done) {
    rmrf('modules.tar');
    rmrf('node_modules');
    rmrf('git-gaia-node-modules');
    exec('NODE_MODULES_GIT_URL=https://git.mozilla.org/b2g/gaia-node-modules.git make node_modules',
      function(error, stdout, stderr) {
        helper.checkError(error, stdout, stderr);

        var modulesTarPath = path.join(process.cwd(), 'git-gaia-node-modules',
          '.git');
        assert.ok(fs.existsSync(modulesTarPath));

        var packageJson = path.join(process.cwd(), 'node_modules',
          'marionette-client', 'package.json');
        assert.ok(fs.existsSync(packageJson));

        done();
    });
  });

  test('make node_modules from github', function(done) {
    rmrf('modules.tar');
    rmrf('node_modules');
    rmrf('git-gaia-node-modules');
    exec('make node_modules',
      function(error, stdout, stderr) {
        helper.checkError(error, stdout, stderr);

        var modulesTarPath = path.join(process.cwd(), 'modules.tar');
        assert.ok(fs.existsSync(modulesTarPath));

        var packageJson = path.join(process.cwd(), 'node_modules',
          'marionette-client', 'package.json');
        assert.ok(fs.existsSync(packageJson));

        done();
    });
  });
});

suite('Build Integration tests', function() {
  var localesDir = 'tmplocales';

  suiteSetup(function() {
    rmrf('profile');
    rmrf('profile-debug');
    rmrf(localesDir);
  });

  test('make without rule & variable', function(done) {
    exec('ROCKETBAR=none make', function(error, stdout, stderr) {
      helper.checkError(error, stdout, stderr);

      // expected values for prefs and user_prefs
      var expectedUserPrefs = {
        'browser.manifestURL': 'app://system.gaiamobile.org/manifest.webapp',
        'browser.homescreenURL': 'app://system.gaiamobile.org/index.html',
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
      var pathInZip = 'shared/resources/branding/initlogo.png';
      // zip path for system app
      var zipPath = path.join(process.cwd(), 'profile', 'webapps',
        'system.gaiamobile.org', 'application.zip');
      // expected branding file, it should be a unofficial branding if we
      // execute |make| without rule and variable.
      var expectedBrandingPath = path.join(process.cwd(),
        'shared', 'resources', 'branding', 'unofficial', 'initlogo.png');

      // Read user.js and use vm module to execute javascript in user.js
      var userjs = fs.readFileSync(
        path.join('profile', 'user.js'),
        { encoding: 'utf8' }
      );
      var sandbox = helper.getPrefsSandbox();
      vm.runInNewContext(userjs, sandbox);

      var webapps = JSON.parse(fs.readFileSync(path.join(process.cwd(),
        'profile', 'webapps', 'webapps.json')));

      helper.checkSettings(settings, commonSettings);
      helper.checkPrefs(sandbox.userPrefs, expectedUserPrefs);
      helper.checkPrefs(sandbox.prefs, expectedPrefs);
      helper.checkWebappsScheme(webapps);
      helper.checkFileInZip(zipPath, pathInZip, expectedBrandingPath);

      // Check blacklist.json of sms app
      var hsSmsZip = new AdmZip(path.join(process.cwd(), 'profile',
                   'webapps', 'sms.gaiamobile.org', 'application.zip'));
      var hsSmsBlacklistJSON =
        hsSmsZip.readAsText(hsSmsZip.getEntry('js/blacklist.json'));
      var expectedResult = ['4850', '7000'];
      assert.deepEqual(JSON.parse(hsSmsBlacklistJSON), expectedResult,
        'Sms blacklist.json is not expected');

      // Check config.js file of gallery
      var hsGalleryZip = new AdmZip(path.join(process.cwd(), 'profile',
                   'webapps', 'gallery.gaiamobile.org', 'application.zip'));
      var hsGalleryConfigJs =
        hsGalleryZip.readAsText(hsGalleryZip.getEntry('js/config.js'));

      var expectedScript =
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
        '// If you do not specify this property then EXIF previews will only' +
        '\n' +
        '// be used if they are big enough to fill the screen in either\n' +
        '// width or height in both landscape and portrait mode.\n' +
        '//\n' +
        'var CONFIG_MAX_IMAGE_PIXEL_SIZE = ' +
          5 * 1024 * 1024 + ';\n' +
        'var CONFIG_MAX_SNAPSHOT_PIXEL_SIZE = ' +
          5 * 1024 * 1024 + ';\n' +
        'var CONFIG_REQUIRED_EXIF_PREVIEW_WIDTH = 0;\n' +
        'var CONFIG_REQUIRED_EXIF_PREVIEW_HEIGHT = 0;\n';

      assert.equal(hsGalleryConfigJs, expectedScript,
        'Gallery config js is not expected');
      done();
    });
  });

  test('make with PRODUCTION=1', function(done) {
    exec('PRODUCTION=1 make', function(error, stdout, stderr) {
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
      done();
    });
  });

  test('make with SIMULATOR=1', function(done) {
    exec('SIMULATOR=1 make', function(error, stdout, stderr) {
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
        'browser.startup.homepage': 'app://system.gaiamobile.org/index.html',
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
        'notification.feature.enabled': true,
        'dom.datastore.enabled': true,
        'dom.testing.datastore_enabled_for_hosted_apps': true,
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
        'font.name.sans-serif.x-western': 'Feura Sans',
        'font.name.monospace.x-western': 'Source Code Pro',
        'font.name-list.sans-serif.x-western': 'Feura Sans, Roboto',
        'extensions.autoDisableScopes': 0,
        'devtools.debugger.enable-content-actors': true,
        'devtools.debugger.prompt-connection': false,
        'devtools.debugger.forbid-certified-apps': false,
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

  test('make with DEBUG=1', function(done) {
    exec('DEBUG=1 make', function(error, stdout, stderr) {
      helper.checkError(error, stdout, stderr);

      var installedExtsPath = path.join('profile-debug',
        'installed-extensions.json');
      var expectedSettings = {
        'homescreen.manifestURL': 'http://homescreen.gaiamobile.org:8080/manifest.webapp',
        'rocketbar.searchAppURL': 'http://search.gaiamobile.org:8080/index.html'
      };
      var expectedUserPrefs = {
        'browser.manifestURL': 'http://system.gaiamobile.org:8080/manifest.webapp',
        'browser.homescreenURL': 'http://system.gaiamobile.org:8080',
        'browser.startup.homepage': 'http://system.gaiamobile.org:8080',
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
        'notification.feature.enabled': true,
        'dom.datastore.enabled': true,
        'dom.testing.datastore_enabled_for_hosted_apps': true,
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
        'font.name.sans-serif.x-western': 'Feura Sans',
        'font.name.monospace.x-western': 'Source Code Pro',
        'font.name-list.sans-serif.x-western': 'Feura Sans, Roboto',
        'docshell.device_size_is_page_size': true,
        'marionette.defaultPrefs.enabled': true,
        'nglayout.debug.disable_xul_cache': true,
        'nglayout.debug.disable_xul_fastload': true,
        'javascript.options.showInConsole': true,
        'browser.dom.window.dump.enabled': true,
        'dom.report_all_js_exceptions': true,
        'dom.w3c_touch_events.enabled': 1,
        'webgl.verbose': true,
        'dom.max_script_run_time': 0,
        'toolkit.identity.debug': true,
        'network.http.use-cache': false,
        'extensions.gaia.dir': process.cwd(),
        'extensions.gaia.domain': 'gaiamobile.org',
        'extensions.gaia.port': 8080,
        'extensions.gaia.locales_debug_path': 'locales',
        'extensions.gaia.official': false,
        'extensions.gaia.locales_file': 'shared/resources/languages.json',
        'extensions.gaia.locale_basedir': '',
        'extensions.gaia.device_pixel_suffix': '',
        'extensions.autoDisableScopes': 0
      };
      var settingsPath = path.join(process.cwd(), 'profile-debug',
        'settings.json');
      var settings = JSON.parse(fs.readFileSync(settingsPath));
      var userjs = fs.readFileSync(
        path.join('profile-debug', 'user.js'),
        { encoding: 'utf8' }
      );
      var sandbox = helper.getPrefsSandbox();
      vm.runInNewContext(userjs, sandbox);

      var zipCount = 0;
      dive(path.join(process.cwd(), 'profile-debug'), {recursive: true},
        function action(err, file) {
          if (file.indexOf('application.zip') !== -1) {
            zipCount++;
          }
        },
        function complete() {
          assert.ok(fs.existsSync(installedExtsPath));
          helper.checkSettings(settings, expectedSettings);
          helper.checkPrefs(sandbox.userPrefs, expectedUserPrefs);
          // only expect one zip file for marketplace.
          assert.equal(zipCount, 1);
          done();
        }
      );
    });
  });

  test('make with MOZILLA_OFFICIAL=1', function(done) {
    exec('MOZILLA_OFFICIAL=1 make', function(error, stdout, stderr) {
      helper.checkError(error, stdout, stderr);

      // path in zip for unofficial branding
      var pathInZip = 'shared/resources/branding/initlogo.png';
      // zip path for system app
      var zipPath = path.join(process.cwd(), 'profile', 'webapps',
        'system.gaiamobile.org', 'application.zip');
      var expectedBrandingPath = path.join(process.cwd(),
        'shared', 'resources', 'branding', 'official', 'initlogo.png');

      helper.checkFileInZip(zipPath, pathInZip, expectedBrandingPath);
      done();
    });
  });

  test('make with ROCKETBAR=full', function(done) {
    exec('ROCKETBAR=full make',
      function(error, stdout, stderr) {
        helper.checkError(error, stdout, stderr);

        var hsBroZip = new AdmZip(path.join(process.cwd(), 'profile',
          'webapps', 'browser.gaiamobile.org', 'application.zip'));
        var hsSysZip = new AdmZip(path.join(process.cwd(), 'profile',
          'webapps', 'system.gaiamobile.org', 'application.zip'));

        var hsInit =
          JSON.parse(hsBroZip.readAsText(hsBroZip.getEntry('js/init.json')));
        var hsBroManifest =
          JSON.parse(hsBroZip.readAsText(hsBroZip.getEntry('manifest.webapp')));
        var defaultJSONPath =
          path.join(process.cwd(), 'apps', 'browser', 'build', 'default.json');
        var hsIcc =
          JSON.parse(hsSysZip.readAsText(
            hsSysZip.getEntry('resources/icc.json')));
        var hsWapuaprof =
          JSON.parse(hsSysZip.readAsText(hsSysZip.getEntry(
            'resources/wapuaprof.json')));
        var hsSysManifest =
          JSON.parse(hsSysZip.readAsText(hsSysZip.getEntry('manifest.webapp')));

        var expectedInitJson = JSON.parse(fs.readFileSync(defaultJSONPath));
        var expectedIcc = {
          'defaultURL': 'http://www.mozilla.org/en-US/firefoxos/'
        };
        var expectedWap = {};
        var expectedManifest = {
          activities: {
            view: {
              filters: {
                type: 'url',
                url: {
                  required: true,
                  pattern: 'https?:.{1,16384}',
                  patternFlags: 'i'
                }
              }
            }
          }
        };
        helper.checkSettings(hsInit, expectedInitJson);
        assert.equal(hsBroManifest.role, 'system');
        assert.equal(hsBroManifest.activities, null);
        helper.checkSettings(hsIcc, expectedIcc);
        helper.checkSettings(hsWapuaprof, expectedWap);
        helper.checkSettings(hsSysManifest, expectedManifest);
        done();
      }
    );
  });

  teardown(function() {
    rmrf('profile');
    rmrf('profile-debug');
  });
});
