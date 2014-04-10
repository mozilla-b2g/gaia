var assert = require('assert');

var SMS_APP = 'app://sms.gaiamobile.org';
var SMS_APP_MANIFEST = SMS_APP + '/manifest.webapp';

marionette('Desktop Notifications', function() {
  var client = marionette.client({
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false
    }
  });

  test('should be cleared after opening app', function() {
    client.apps.launch(SMS_APP);
    client.apps.switchToApp(SMS_APP);

    // wait for the ActivityHandler
    client.waitFor(function() {
      return client.executeScript(function() {
        return window.wrappedJSObject.ActivityHandler;
      });
    });

    // simulate sms recieved system message
    client.executeScript(function() {
        window.wrappedJSObject.ActivityHandler.onSmsReceived({
          sender: '5555555555',
          threadId: 1,
          id: 'id',
          subject: 'subject',
          type: 'sms',
          body: 'body'
        });
    });

    // kill sms app
    client.switchToFrame();
    client.apps.close(SMS_APP);

    var getNotifications = function() {
      return client.findElements('#desktop-notifications-container > div');
    };

    // verify we have our notification
    var notifications = getNotifications();
    assert.equal(notifications.length, 1, '1 notification displayed');

    // relaunch sms app
    client.apps.launch(SMS_APP);
    client.apps.switchToApp(SMS_APP);

    // make sure notification was cleared
    client.switchToFrame();
    notifications = getNotifications();
    assert.equal(notifications.length, 0, 'notifications cleared');
  });
});
