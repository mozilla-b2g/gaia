'use strict';

var SMS_APP = 'app://sms.gaiamobile.org';

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
      window.wrappedJSObject.NotificationHelper.send('title', 'body');
    });

    // kill sms app
    client.switchToFrame();
    client.apps.close(SMS_APP);

    var getNotifications = function() {
      return client.findElements(
        '#desktop-notifications-container .notification'
      );
    };

    client.waitFor(function () {
      return getNotifications().length > 0;
    });

    // relaunch sms app
    client.apps.launch(SMS_APP);
    client.apps.switchToApp(SMS_APP);

    // make sure notification was cleared
    client.switchToFrame();
    client.waitFor(function() {
      var searchTimeout = client.searchTimeout;
      client.setSearchTimeout(0);

      var test = getNotifications().length === 0;

      client.setSearchTimeout(searchTimeout);
      return test;
    });
  });
});
