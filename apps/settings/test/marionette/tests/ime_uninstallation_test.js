'use strict';
var Settings = require('../app/app');
var assert = require('assert');
var SystemApp = require('../app/system_app');
var AppInstall =
  require('../../../../../apps/system/test/marionette/lib/app_install');


marionette('Uninstall an ime app', function() {
  var IME_TEST_APP_ORIGIN = 'app://imetestapp.gaiamobile.org';
  var IME_TEST_APP_NAME = 'LOL Keyboard';

  var preloadApps = {};
  // And a testing 3rd-party IME app
  preloadApps[IME_TEST_APP_ORIGIN] = __dirname + '/../imetestapp';

  var client = marionette.client({
    apps: preloadApps
  });

  var systemApp;
  var settingsApp;
  var appInstall;
  var appPermissionPanel;

  setup(function() {
    systemApp = new SystemApp(client);
    settingsApp = new Settings(client);
    appInstall = new AppInstall(client);

    settingsApp.launch();
    appPermissionPanel = settingsApp.appPermissionPanel;
  });

  test('Uninstall the preload IME Test App', function() {
    function findImeTestApp(element) {
      return IME_TEST_APP_NAME === element.text();
    }

    // Find the IME Test app we preload.
    var apps = appPermissionPanel.appList.filter(findImeTestApp);

    // Make sure LOL Keyboard is listed.
    assert.equal(apps.length, 1);

    var imeAppItem = apps[0];
    imeAppItem.click();
    appPermissionPanel.uninstallButton.click();

    // confirm to uninstall
    appInstall.confirmUninstallDialog();

    // Switch back to settings app
    settingsApp.switchTo();

    // Make sure LOL Keyboard is not listed in app list
    apps = appPermissionPanel.appList.filter(findImeTestApp);
    assert.equal(apps.length, 0);
  });
});
