var assert = require('assert'),
    NotificationTest = require('./lib/notification').NotificationTest,
    NotificationList = require('./lib/notification').NotificationList;

var TARGET_APP = 'app://calendar.gaiamobile.org';
var TARGET_APP_MANIFEST = TARGET_APP + '/manifest.webapp';

marionette('launch an app via notification click', function() {
  var client = marionette.client({
    settings: {
      'ftu.manifestURL': null
    }
  });
  var notificationList = new NotificationList(client);
  var notification;

  setup(function() {
    // launch the app
    client.apps.launch(TARGET_APP);
    client.apps.switchToApp(TARGET_APP);

    // create the notification for given app
    notification =
      new NotificationTest(client, '123', 'test', 'test');

    // close the app
    client.switchToFrame();
    client.apps.close(TARGET_APP);

    // go back to the system app
    client.switchToFrame();
  });

  // Skipping this test until all B2G Desktop instances run OOP or else
  // we can tell when an app is closed without relying on process status
  test.skip('clicking notification launches app', function() {
    // because of the trace conditions we need to pull down the tray and tap
    // that notification.

    // show utility tray
    client.executeScript(function() {
      window.wrappedJSObject.UtilityTray.show();
    });

    notificationList.refresh();
    assert.ok(notificationList.contains('test', 'test', TARGET_APP_MANIFEST),
              'target app should contain the notification we just added');

    // tap the container element should launch the app
    // TODO: this needs to be reworked to allow for notification tapping
    // notification.containerElement.tap();
    var appFrame = client.apps.switchToApp(TARGET_APP);
  });

});
