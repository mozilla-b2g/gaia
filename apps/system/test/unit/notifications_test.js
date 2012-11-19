requireApp('system/test/unit/mock_statusbar.js');
requireApp('system/test/unit/mock_gesture_detector.js');

requireApp('system/js/notifications.js');

var mocks = ['StatusBar', 'GestureDetector'];

mocks.forEach(function(objName) {
  if (! window[objName]) {
    window[objName] = null;
  }
});

suite('system/NotificationScreen', function() {
  var fakeNotifContainer, fakeLockScreenContainer, fakeToaster, fakeButton;
  var realWindowObjects = {};

  suiteSetup(function() {
    mocks.forEach(function(objName) {
      var mockName = 'Mock' + objName;
      if (!window[mockName]) {
        throw 'Mock ' + mockName + ' has not been loaded into the test';
      }

      realWindowObjects[objName] = window[objName];
      window[objName] = window[mockName];
    });
  });

  suiteTeardown(function() {
    mocks.forEach(function(objName) {
      window[objName] = realWindowObjects[objName];
    });
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

    NotificationScreen.init();
  });

  teardown(function() {
    fakeNotifContainer.parentNode.removeChild(fakeNotifContainer);
    fakeLockScreenContainer.parentNode.removeChild(fakeLockScreenContainer);
    fakeToaster.parentNode.removeChild(fakeToaster);
    fakeButton.parentNode.removeChild(fakeButton);
  });

  suite('updateStatusBarIcon', function() {
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
