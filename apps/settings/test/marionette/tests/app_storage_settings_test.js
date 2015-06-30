'use strict';
var Settings = require('../app/app'),
    assert = require('assert');

marionette('manipulate app storage settings', function() {
  var client = marionette.client();
  var settingsApp;
  var appStoragePanel;

  function gotoAppStoragePanel() {
    settingsApp = new Settings(client);
    settingsApp.launch();
    // Navigate to the Support menu
    appStoragePanel = settingsApp.appStoragePanel;
  }

  suite('check app storage basics', function() {
    setup(function() {
      gotoAppStoragePanel();
    });

    test('check storage data contain numbers', function() {
      assert.ok(appStoragePanel.containNumberInAppTotalSpace);
      assert.ok(appStoragePanel.containNumberInAppUsedSpace);
      assert.ok(appStoragePanel.containNumberInAppFreeSpace);
    });
  });
});
