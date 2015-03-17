'use strict';
var Settings = require('../app/app'),
    assert = require('assert');

marionette('manipulate app permissions', function() {
  var client = marionette.client();
  var settingsApp;
  var appManagerPanel;

  setup(function() {
    settingsApp = new Settings(client);
    settingsApp.launch();
    appManagerPanel = settingsApp.appManagerPanel;
  });

  test('set geolocation of first app to Grant', function() {
    appManagerPanel.enterPermissionDetail();
    appManagerPanel.tapGeolocationSelect('Grant');
    assert.equal(appManagerPanel.geolocationSelectValue, 'allow');
  });
});
