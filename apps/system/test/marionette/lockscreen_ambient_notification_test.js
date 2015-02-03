'use strict';

marionette('LockScreen ambient notification', function() {
  var LockScreenNotificationActions, lsActions, system;
  var client = marionette.client({
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': true
    }
  });

  setup(function() {
    LockScreenNotificationActions =
      require('./lib/lockscreen_notification_actions');
    lsActions = (new LockScreenNotificationActions()).start(client);
    system = client.loader.getAppClass('system');
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
      return !client.findElement('.notifications-shadow').displayed();
    });
  });
});
