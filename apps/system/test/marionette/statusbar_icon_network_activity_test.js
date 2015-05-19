'use strict';

var StatusBar = require('./lib/statusbar');

marionette('Status Bar icons - Network Activity', function() {

  var client = marionette.client();

  var system, statusBar, networkActivity;

  setup(function() {
    system = client.loader.getAppClass('system');
    statusBar = new StatusBar(client);
    system.waitForStartup();
    networkActivity = statusBar['network-activity'];
    networkActivity.hide();
  });

  test('should appear briefly after a moznetworkupload event', function() {
    statusBar.dispatchEvent('moznetworkupload');

    // The icon appears after the event is triggered.
    networkActivity.waitForIconToAppear();

    // Then it disappears after a short delay.
    networkActivity.waitForIconToDisappear();
  });

  test('should appear briefly after a moznetworkdownload event', function() {
    statusBar.dispatchEvent('moznetworkdownload');

    // The icon appears after the event is triggered.
    networkActivity.waitForIconToAppear();

    // Then it disappears after a short delay.
    networkActivity.waitForIconToDisappear();
  });
});
