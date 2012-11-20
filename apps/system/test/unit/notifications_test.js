requireApp('system/test/unit/mock_statusbar.js');
requireApp('system/test/unit/mock_gesture_detector.js');
requireApp('system/test/unit/mocks_helper.js');

requireApp('system/js/notifications.js');

var mocksForNotificationScreen = ['StatusBar', 'GestureDetector'];

mocksForNotificationScreen.forEach(function(mockName) {
  if (! window[mockName]) {
    window[mockName] = null;
  }
});


suite('system/NotificationScreen >', function() {
  var fakeNotifContainer, fakeLockScreenContainer, fakeToaster, fakeButton;

  var mocksHelper;

  suiteSetup(function() {
    mocksHelper = new MocksHelper(mocksForNotificationScreen);
    mocksHelper.suiteSetup();
  });

  suiteTeardown(function() {
    mocksHelper.suiteTeardown();
  });

  setup(function() {
    fakeNotifContainer = document.createElement('div');
    fakeNotifContainer.id = 'desktop-notifications-container';
    // add some children, we don't care what they are
    fakeNotifContainer.appendChild(document.createElement('div'));
    fakeNotifContainer.appendChild(document.createElement('div'));


    fakeLockScreenContainer = document.createElement('div');
    fakeLockScreenContainer.id = 'notifications-lockscreen-container';

    fakeToaster = document.createElement('div');
    fakeToaster.id = 'notification-toaster';

    fakeButton = document.createElement('button');
    fakeButton.id = 'notification-clear';

    document.body.appendChild(fakeToaster);
    document.body.appendChild(fakeNotifContainer);
    document.body.appendChild(fakeLockScreenContainer);
    document.body.appendChild(fakeButton);

    mocksHelper.setup();

    NotificationScreen.init();
  });

  teardown(function() {
    fakeNotifContainer.parentNode.removeChild(fakeNotifContainer);
    fakeLockScreenContainer.parentNode.removeChild(fakeLockScreenContainer);
    fakeToaster.parentNode.removeChild(fakeToaster);
    fakeButton.parentNode.removeChild(fakeButton);

    mocksHelper.teardown();
  });

  suite('updateStatusBarIcon >', function() {
    setup(function() {
      NotificationScreen.updateStatusBarIcon();
    });

    test('should update the icon in the status bar', function() {
      assert.ok(MockStatusBar.wasMethodCalled['updateNotification']);
      assert.equal(2, MockStatusBar.notificationsCount);
    });

    test('external notif should not be able to decrease the global count',
      function() {

      NotificationScreen.decExternalNotifications();
      assert.equal(2, MockStatusBar.notificationsCount);
    });

    test('external notif should increase the global count',
      function() {

      NotificationScreen.incExternalNotifications();
      assert.isTrue(MockStatusBar.mNotificationUnread);
      assert.equal(3, MockStatusBar.notificationsCount);
    });

    test('external notif should decrease the global count',
      function() {

      NotificationScreen.incExternalNotifications();
      MockStatusBar.mNotificationUnread = false;
      NotificationScreen.decExternalNotifications();
      assert.isFalse(MockStatusBar.mNotificationUnread);
      assert.equal(2, MockStatusBar.notificationsCount);
    });

    test('should change the read status', function() {
      NotificationScreen.updateStatusBarIcon(true);
      assert.isTrue(MockStatusBar.mNotificationUnread);
    });
  });

});
