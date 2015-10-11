'use strict';

var Settings = require('../app/app'),
    assert = require('assert');

marionette('manipulate browsing privacy settings', function() {
  var client = marionette.client();
  var settingsApp;
  var browsingPrivacyPanel;

  setup(function() {
    settingsApp = new Settings(client);
    settingsApp.launch();
    // Navigate to the Browsing Privacy menu
    browsingPrivacyPanel = settingsApp.browsingPrivacyPanel;
  });

  test('check tracking protection initial state and toggle', function() {
    assert.ok(
      !browsingPrivacyPanel.isTrackingProtectionEnabled,
      'tracking protection disabled by default'
    );
    browsingPrivacyPanel.enableTrackingProtection();
    assert.ok(
      browsingPrivacyPanel.isTrackingProtectionEnabled,
      'tracking protection has been enabled'
    );
  });
});
