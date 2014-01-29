var exec = require('child_process').exec;
var assert = require('chai').assert;
var rmrf = require('rimraf').sync;
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var AdmZip = require('adm-zip');
var dive = require('dive');
var helper = require('./helper');

suite('Build Integration tests', function() {
  var localesDir = 'tmplocales';

  suiteSetup(function() {
    rmrf('profile');
    rmrf('profile-debug');
    rmrf(localesDir);
  });

  test('make without rule & variable', function(done) {
    exec('ROCKETBAR=0 make', function(error, stdout, stderr) {
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

  test('make with GAIA_DISTRIBUTION_DIR=distribution_tablet', function(done) {
    exec('GAIA_DISTRIBUTION_DIR=distribution_tablet make',
      function(error, stdout, stderr) {
        helper.checkError(error, stdout, stderr);

        var hsZip = new AdmZip(path.join(process.cwd(), 'profile',
          'webapps', 'homescreen.gaiamobile.org', 'application.zip'));
        var hsInit = JSON.parse(hsZip.readAsText(hsZip.getEntry('js/init.json')));
        var settingsPath = path.join(process.cwd(), 'profile', 'settings.json');
        var settings = JSON.parse(fs.readFileSync(settingsPath));
        var expectedSettings = {
          'wap.push.enabled': false
        };

        helper.checkSettings(settings, expectedSettings);
        assert.equal(hsInit['search_page'].enabled, false);
        assert.equal(hsInit.swipe.threshold, 0.25);
        done();
      }
    );
  });

  teardown(function() {
    rmrf('profile');
    rmrf('profile-debug');
  });
});
