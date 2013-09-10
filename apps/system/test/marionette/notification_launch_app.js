var assert = require('assert'),
    NotificationTest = require('./notification');

var TARGET_APP = 'app://calendar.gaiamobile.org';

marionette('launch an app via notification click', function() {
  var client = marionette.client({
    settings: {
      'ftu.manifestURL': null
    }
  });
  var notification;

  setup(function() {
    // launch the app
    client.apps.launch(TARGET_APP);
    client.apps.switchToApp(TARGET_APP);

    // create the notification for given app
    notification =
      new NotificationTest(client, TARGET_APP, '123', 'test', 'test');

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

    // because of the trace conditions we need to pull down the tray and tap
    // that notification.
    assert.ok(notification.trayElement, 'has notification');

    // tap the container element should launch the app
    notification.trayElement.tap();
    var appFrame = client.apps.switchToApp(TARGET_APP);
  });

});
