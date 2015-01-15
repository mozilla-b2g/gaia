var assert = require('assert'),
    NotificationTest = require('./lib/notification').NotificationTest,
    NotificationList = require('./lib/notification').NotificationList;

var TARGET_APP = 'app://email.gaiamobile.org';
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
    notification = new NotificationTest(client, {
      tag: '123',
      title: 'test',
      body: 'test'
    });

    // close the app
    client.switchToFrame();
    client.apps.close(TARGET_APP);

    // go back to the system app
    client.switchToFrame();
  });

  test('clicking notification launches app', function() {
    // show utility tray
    client.executeScript(function() {
      window.wrappedJSObject.UtilityTray.show();
    });

    // make sure we have our notification to click
    notificationList.refresh();
    var notifications = notificationList.getForApp(TARGET_APP_MANIFEST);
    assert.equal(notifications.length, 1);

    // tap the container element should launch the app
    notificationList.tap(notifications[0]);

    // email will clear the notification from the tray, so wait
    // until the notification has indeed been cleared
    client.waitFor(function() {
      notificationList.refresh();
      var notifications = notificationList.getForApp(TARGET_APP_MANIFEST);
      return notifications.length === 0;
    });
  });

});
