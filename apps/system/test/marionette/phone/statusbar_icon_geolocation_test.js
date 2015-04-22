'use strict';

var StatusBar = require('../lib/statusbar');
var assert = require('assert');
var APP = 'app://sms.gaiamobile.org';

marionette('Status Bar icons - Geolocation', function() {

  var client = marionette.client({
    prefs: {
      'dom.w3c_touch_events.enabled': 1
    }
  });

  var system;
  var statusBar;
  var icon;

  // Open an app to get the minimised status bar.
  function launchApp() {
    client.apps.launch(APP);
  }

  setup(function() {
    system = client.loader.getAppClass('system');
    statusBar = new StatusBar(client);
    system.waitForStartup();
    statusBar.dispatchMozChromeEvent('geolocation-status', {active: true});
  });

  test('should be visible', function() {
    icon = statusBar.geolocation.waitForIconToAppear();
    // Make sure the icon is completely opaque.
    assert.equal('true', icon.getAttribute('data-active'));
  });

  test('should turn translucent after deactivation then disappear', function() {
    icon = statusBar.geolocation.waitForIconToAppear();
    statusBar.dispatchMozChromeEvent('geolocation-status', {active: false});

    // First, the icon is deactivated...
    assert.equal('false', icon.getAttribute('data-active'));

    // ... then it disappears after a little while
    statusBar.geolocation.waitForIconToDisappear();
  });

  test('should be visible in minimised status bar', function() {
    launchApp();

    icon = statusBar.minimised.geolocation.waitForIconToAppear();
    // Make sure the icon is completely opaque.
    assert.equal('true', icon.getAttribute('data-active'));
  });

  test('should turn translucent after deactivation then disappear in ' +
  'minimised status bar', function() {
    launchApp();

    statusBar.minimised.geolocation.waitForIconToAppear();
    statusBar.dispatchMozChromeEvent('geolocation-status', {active: false});

    // First, the icon is deactivated...
    icon = statusBar.minimised.geolocation.icon; // Refresh the element.
    assert.equal('false', icon.getAttribute('data-active'));

    // ... then it disappears after a little while
    statusBar.geolocation.waitForIconToDisappear();
  });
});
