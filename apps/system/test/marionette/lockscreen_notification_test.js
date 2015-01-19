'use strict';

marionette('LockScreen notification tests', function() {
  var LockScreenNotificationActions, actions, system;
  var LockScreenNotificationChecks, checks;
  var client = marionette.client({
    settings: {
      'lockscreen.enabled': true
    }
  });

  setup(function() {
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
    LockScreenNotificationActions =
      require('./lib/lockscreen_notification_actions');
    LockScreenNotificationChecks =
      require('./lib/lockscreen_notification_checks');
    actions = (new LockScreenNotificationActions()).start(client);
    checks = (new LockScreenNotificationChecks()).start(client);
  });

  test('fire notification', function() {
    var details = {
     tag: 'test tag',
     title: 'test title',
     body: 'test body',
     dir: 'rtl',
     lang: 'en'
    };
    actions
      .fireNotification(details);
    checks
      .contains(details);
  });

  test('system replace notification', function() {
    var oldDetails = {
      tag: 'test tag, replace',
      title: 'test title, replace',
      body: 'test body, replace',
      dir: 'rtl',
      lang: 'en'
    };
    var newDetails = {
      tag: 'test tag, replace',
      title: 'new test title, replace',
      body: 'new test body, replace',
      dir: 'ltr',
      lang: 'sr-Cyrl'
    };
    actions
      .fireNotification(oldDetails);
    checks
      .contains(oldDetails);

    actions
      .fireNotification(newDetails);
    checks
      .contains(newDetails)
      .not().contains(oldDetails);
  });

  test('close notification', function() {
    var details = {
      tag: 'test tag, close',
      title: 'test title, close',
      body: 'test body, close'
    };
    actions
      .fireNotification(details);
    checks
      .contains(details);
    actions
      .closeNotification(details);
    checks
      .not().contains(details);
  });
});
