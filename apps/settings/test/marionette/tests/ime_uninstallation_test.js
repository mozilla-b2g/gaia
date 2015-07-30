'use strict';
var Settings = require('../app/app');
var assert = require('assert');

marionette('Uninstall an ime app', function() {
  var IME_TEST_APP_ORIGIN = 'app://imetestapp.gaiamobile.org';
  var IME_TEST_APP_NAME = 'LOL Keyboard';

  var preloadApps = {};
  // And a testing 3rd-party IME app
  preloadApps[IME_TEST_APP_ORIGIN] = __dirname + '/../../fixtures/imetestapp';

  var client = marionette.client({
    profile: {
      apps: preloadApps
    }
  });

  var confirmDialog;
  var settingsApp;
  var appPermissionPanel;
  var system;

  setup(function() {
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
    confirmDialog = client.loader.getAppClass('system', 'confirm_dialog');
    settingsApp = new Settings(client);

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
    imeAppItem.tap(5, 5);
    appPermissionPanel.uninstallButton.click();

    // confirm to uninstall
    client.switchToFrame();
    confirmDialog.confirm('remove');

    // Switch back to settings app
    settingsApp.switchTo();

    // Make sure LOL Keyboard is not listed in app list
    apps = appPermissionPanel.appList.filter(findImeTestApp);
    assert.equal(apps.length, 0);
  });
});
