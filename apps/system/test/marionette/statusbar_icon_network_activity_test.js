'use strict';

var StatusBar = require('./lib/statusbar');

marionette('Status Bar icons - Network Activity', function() {

  var client = marionette.client({
    prefs: {
      'dom.w3c_touch_events.enabled': 1
    }
  }, undefined, { 'raisesAccessibilityExceptions': true });

  var system;
  var statusBar;

  setup(function() {
    system = client.loader.getAppClass('system');
    statusBar = new StatusBar(client);
    system.waitForStartup();
    statusBar.networkActivity.hide();
  });

  test('should appear briefly after a moznetworkupload event', function() {
    statusBar.dispatchEvent('moznetworkupload');

    // The icon appears after the event is triggered.
    statusBar.networkActivity.waitForIconToAppear();

    // Then it disappears after a short delay.
    statusBar.networkActivity.waitForIconToDisappear();
  });

  test('should appear briefly after a moznetworkdownload event', function() {
    statusBar.dispatchEvent('moznetworkdownload');

    // The icon appears after the event is triggered.
    statusBar.networkActivity.waitForIconToAppear();

    // Then it disappears after a short delay.
    statusBar.networkActivity.waitForIconToDisappear();
  });
});
