'use strict';
var Settings = require('../app/app'),
    assert = require('assert');

marionette('manipulate notifications settings', function() {
  var client = marionette.client();
  var settingsApp;
  var notificationsPanel;

  setup(function() {
    settingsApp = new Settings(client);
    settingsApp.launch();
    // Navigate to the battery menu
    notificationsPanel = settingsApp.notificationsPanel;
  });

  test('check Show on lockscreen checkbox initial state', function() {
    assert.ok(
      notificationsPanel.isShowOnLockScreenEnabled,
      'Show on lockscreen is disabled by default'
    );
  });

  test('disable Show on lockscreen', function() {
    notificationsPanel.tapOnShowOnLockScreen();
    assert.ok(
      !notificationsPanel.isShowOnLockScreenEnabled,
      'Show on lockscreen has been disabled'
    );
  });

});
