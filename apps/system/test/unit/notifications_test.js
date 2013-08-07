'use strict';

mocha.globals(['ScreenManager']);

requireApp('system/test/unit/mock_statusbar.js');
requireApp('system/test/unit/mock_gesture_detector.js');
requireApp('system/test/unit/mock_settings_listener.js');
requireApp('system/test/unit/mocks_helper.js');

requireApp('system/js/notifications.js');

var mocksForNotificationScreen = ['StatusBar', 'GestureDetector',
                                  'SettingsListener'];

mocksForNotificationScreen.forEach(function(mockName) {
  if (! window[mockName]) {
    window[mockName] = null;
  }
});


suite('system/NotificationScreen >', function() {
  var fakeNotifContainer, fakeLockScreenContainer, fakeToaster,
    fakeButton, fakeToasterIcon, fakeToasterTitle, fakeToasterDetail;

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

    function createFakeElement(tag, id) {
      var obj = document.createElement(tag);
      obj.id = id;
      return obj;
    };

    fakeLockScreenContainer = createFakeElement('div',
      'notifications-lockscreen-container');
    fakeToaster = createFakeElement('div', 'notification-toaster');
    fakeButton = createFakeElement('button', 'notification-clear');
    fakeToasterIcon = createFakeElement('img', 'toaster-icon');
    fakeToasterTitle = createFakeElement('div', 'toaster-title');
    fakeToasterDetail = createFakeElement('div', 'toaster-detail');

    document.body.appendChild(fakeNotifContainer);

    document.body.appendChild(fakeLockScreenContainer);
    document.body.appendChild(fakeToaster);
    document.body.appendChild(fakeButton);
    document.body.appendChild(fakeToasterIcon);
    document.body.appendChild(fakeToasterTitle);
    document.body.appendChild(fakeToasterDetail);

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

  suite('chrome events >', function() {
    setup(function() {
      this.sinon.stub(NotificationScreen, 'addNotification');
      this.sinon.stub(NotificationScreen, 'removeNotification');
    });

    function sendChromeEvent(detail) {
      var event = new CustomEvent('mozChromeEvent', {
        detail: detail
      });

      window.dispatchEvent(event);
    }

    test('showing a notification', function() {
      sendChromeEvent({
        type: 'desktop-notification',
        id: 1
      });

      assert.ok(NotificationScreen.addNotification.called);
      assert.equal(NotificationScreen.addNotification.args[0][0].id, 1);
    });

    test('closing a notification', function() {
      sendChromeEvent({
        type: 'desktop-notification-close',
        id: 1
      });
      assert.ok(NotificationScreen.removeNotification.called);
      assert.equal(NotificationScreen.removeNotification.args[0][0], 1);
    });
  });

  suite('updateStatusBarIcon >', function() {
    var realScreenManager;
    setup(function() {
      realScreenManager = window.ScreenManager;
      window.ScreenManager = {
        screenEnabled: true,
        turnScreenOn: sinon.stub()
      };
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

    test('calling addNotification without icon', function() {
      var toasterIcon = NotificationScreen.toasterIcon;
      var imgpath = 'http://example.com/test.png';
      var detail = {icon: imgpath, title: 'title', detail: 'detail'};
      NotificationScreen.addNotification(detail);
      assert.equal(imgpath, toasterIcon.src);
      assert.isFalse(toasterIcon.hidden);
      delete detail.icon;
      NotificationScreen.addNotification(detail);
      assert.isTrue(toasterIcon.hidden);
    });

    test('remove lockscreen notifications at the same time', function() {
      NotificationScreen.addNotification({ id: 10000, title: '', message: '' });
      NotificationScreen.removeNotification(10000);
      assert.equal(
        null,
        fakeLockScreenContainer.querySelector(
          '[data-notification-i-d="10000"]'));
    });

    teardown(function() {
      window.ScreenManager = realScreenManager;
    });
  });

});
