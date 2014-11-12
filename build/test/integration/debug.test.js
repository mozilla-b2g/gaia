var assert = require('chai').assert;
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var helper = require('./helper');
var dive = require('diveSync');

suite('Make with DEBUG=1', function() {
  suiteSetup(helper.cleanupWorkspace);
  teardown(helper.cleanupWorkspace);

    test('make with DEBUG=1', function(done) {
    // avoid downloading extension from addon website
    var extConfigPath  = path.join('build', 'config',
      'additional-extensions.json');
    var restoreFunc = helper.emptyJsonFile(extConfigPath);

    helper.exec('DEBUG=1 make', function(error, stdout, stderr) {
      helper.checkError(error, stdout, stderr);

      var installedExtsPath = path.join('build_stage', 'additional-extensions',
        'downloaded.json');
      var expectedSettings = {
        'homescreen.manifestURL': 'app://verticalhome.gaiamobile.org/manifest.webapp',
        'rocketbar.searchAppURL': 'app://search.gaiamobile.org/index.html'
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
        'image.mozsamplesize.enabled': true,
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
      dive(path.join(process.cwd(), 'profile-debug'), function(err, file) {
        if (err) {
          throw err;
        }
        if (file.indexOf('application.zip') !== -1) {
          zipCount++;
        }
      });
      assert.ok(fs.existsSync(installedExtsPath));
      helper.checkSettings(settings, expectedSettings);
      helper.checkPrefs(sandbox.userPrefs, expectedUserPrefs);
      // only expect one zip file for marketplace.
      assert.equal(zipCount, 3, 'we should have three zip files in ' +
        'profile-debug directory');

      restoreFunc();
      done();
    });
  });
});
