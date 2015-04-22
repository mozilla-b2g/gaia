'use strict';

var StatusBar = require('../lib/statusbar');
var assert = require('assert');
var APP = 'app://sms.gaiamobile.org';

marionette('Status Bar icons - Recording', function() {

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
    // statusBar.changeDelayValue('RecordingIcon');
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

    icon = statusBar.minimised.recording.waitForIconToAppear();
    // Make sure the icon is completely opaque.
    assert.equal('true', icon.getAttribute('data-active'));
  });

  test('should turn translucent after deactivation then disappear in ' +
  'minimised status bar', function() {
    launchApp();

    statusBar.minimised.recording.waitForIconToAppear();
    statusBar.dispatchMozChromeEvent('recording-status',
      {active: false, requestURL: 'app://fake.recorder.org'});
    // First, the icon is deactivated...
    icon = statusBar.minimised.recording.icon; // Refresh the element.
    assert.equal('false', icon.getAttribute('data-active'));

    // ... then it disappears after a little while
    statusBar.recording.waitForIconToDisappear();
  });
});
