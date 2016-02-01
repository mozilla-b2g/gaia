'use strict';

var StatusBar = require('./lib/statusbar');
var assert = require('assert');
var APP = 'app://sms.gaiamobile.org';

marionette('Status Bar icons - Recording', function() {

  var client = marionette.client();

  var system;
  var statusBar;
  var icon;

  // Open an app to get the minimised status bar.
  function launchApp() {
    client.apps.launch(APP);
  }

  setup(function() {
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
    statusBar = new StatusBar(client);
    statusBar.dispatchMozChromeEvent('recording-status', {active: true,
      requestURL: 'app://fake.recorder.org'});
  });

  test('should be visible', function() {
    icon = statusBar.recording.waitForIconToAppear();
    // Make sure the icon is completely opaque.
    assert.equal('true', icon.getAttribute('data-active'));
  });

  test('should turn translucent after deactivation then disappear', function() {
    icon = statusBar.recording.waitForIconToAppear();
    statusBar.dispatchMozChromeEvent('recording-status',
      {active: false, requestURL: 'app://fake.recorder.org'});

    // First, the icon is deactivated...
    assert.equal('false', icon.getAttribute('data-active'));

    // ... then it disappears after a little while
    statusBar.recording.waitForIconToDisappear();
  });

  test('should be visible in minimised status bar', function() {
    launchApp();

    icon = statusBar.recording.waitForIconToAppear();
    // Make sure the icon is completely opaque.
    assert.equal('true', icon.getAttribute('data-active'));
  });

  test('should turn translucent after deactivation then disappear in ' +
  'minimised status bar', function() {
    launchApp();

    statusBar.recording.waitForIconToAppear();
    statusBar.dispatchMozChromeEvent('recording-status',
      {active: false, requestURL: 'app://fake.recorder.org'});
    // First, the icon is deactivated...
    icon = statusBar.recording.icon; // Refresh the element.
    assert.equal('false', icon.getAttribute('data-active'));

    // ... then it disappears after a little while
    statusBar.recording.waitForIconToDisappear();
  });
});
