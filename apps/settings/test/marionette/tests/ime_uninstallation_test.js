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
    apps: preloadApps
  });

  var confirmDialog;
  var settingsApp;
  var appManagerPanel;

  setup(function() {
    confirmDialog = client.loader.getAppClass('system', 'confirm_dialog');
    settingsApp = new Settings(client);

    settingsApp.launch();
    appManagerPanel = settingsApp.appManagerPanel;
  });

  test('Uninstall the preload IME Test App', function() {
    function findImeTestApp(element) {
      return IME_TEST_APP_NAME === element.text();
    }

    // Find the IME Test app we preload.
    var apps = appManagerPanel.appList.filter(findImeTestApp);

    // Make sure LOL Keyboard is listed.
    assert.equal(apps.length, 1);

    var imeAppItem = apps[0];
    imeAppItem.click();
    appManagerPanel.uninstallButton.click();

    // confirm to uninstall
    client.switchToFrame();
    confirmDialog.confirm('remove');

    // Switch back to settings app
    settingsApp.switchTo();

    // Make sure LOL Keyboard is not listed in app list
    apps = appManagerPanel.appList.filter(findImeTestApp);
    assert.equal(apps.length, 0);
  });
});
