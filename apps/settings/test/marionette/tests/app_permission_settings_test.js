'use strict';
var Settings = require('../app/app'),
    assert = require('assert');

marionette('manipulate app permissions', function() {
  var client = marionette.client();
  var settingsApp;
  var appPermissionPanel;

  setup(function() {
    settingsApp = new Settings(client);
    settingsApp.launch();
    appPermissionPanel = settingsApp.appPermissionPanel;
  });

  test('set geolocation of first app to Grant', function() {
    appPermissionPanel.enterPermissionDetail();
    client.scope({ searchTimeout: 4000 });
    appPermissionPanel.tapGeolocationSelect('Grant');
    assert.equal(appPermissionPanel.georlocationSelectValue, 'allow');

  });
});
