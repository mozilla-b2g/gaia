'use strict';

marionette('LockScreen ambient notification', function() {
  var LockScreenNotificationActions, lsActions, system;
  var client = marionette.client();

  setup(function() {
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
    LockScreenNotificationActions =
      require('./lib/lockscreen_notification_actions');
    lsActions = (new LockScreenNotificationActions()).start(client);
  });

  test('ambient notification is not visible', function() {
    var details = {
     tag: 'test tag',
     title: 'test title',
     body: 'test body',
     dir: 'rtl',
     lang: 'en'
    };
    lsActions.fireNotification(details);

    function findToaster() {
      return client.findElement('.notification-toaster');
    }

    // Wait for the notification to go away and ensure
    // we do not have an ambient indicator.
    client.waitFor(function() {
      return findToaster().displayed();
    });
    client.waitFor(function() {
      return !findToaster().displayed();
    });
    client.waitFor(function() {
      return !client.findElement(
        '.lockScreenWindow .notifications-shadow').displayed();
    });
  });
});
