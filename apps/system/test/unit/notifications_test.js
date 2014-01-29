/* global
  mocha,
  MocksHelper,
  MockStatusBar,
  NotificationScreen
 */

'use strict';

mocha.globals(['ScreenManager']);

require('/shared/test/unit/mocks/mock_settings_url.js');
require('/test/unit/mock_statusbar.js');
require('/shared/test/unit/mocks/mock_gesture_detector.js');
require('/test/unit/mock_utility_tray.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/js/notifications.js');

var mocksForNotificationScreen = new MocksHelper([
  'StatusBar',
  'GestureDetector',
  'SettingsListener',
  'SettingsURL',
  'UtilityTray'
]).init();

suite('system/NotificationScreen >', function() {
  var fakeNotifContainer, fakeLockScreenContainer, fakeToaster,
    fakeButton, fakeNoNotifications, fakeToasterIcon, fakeToasterTitle,
    fakeToasterDetail, fakeSomeNotifications;

  mocksForNotificationScreen.attachTestHelpers();
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
    }

    fakeLockScreenContainer = createFakeElement('div',
      'notifications-lockscreen-container');
    fakeToaster = createFakeElement('div', 'notification-toaster');
    fakeSomeNotifications = createFakeElement('span', 'notification-some');
    fakeNoNotifications = createFakeElement('span', 'notification-none');
    fakeButton = createFakeElement('button', 'notification-clear');
    fakeToasterIcon = createFakeElement('img', 'toaster-icon');
    fakeToasterTitle = createFakeElement('div', 'toaster-title');
    fakeToasterDetail = createFakeElement('div', 'toaster-detail');

    document.body.appendChild(fakeNotifContainer);

    document.body.appendChild(fakeLockScreenContainer);
    document.body.appendChild(fakeToaster);
    document.body.appendChild(fakeSomeNotifications);
    document.body.appendChild(fakeNoNotifications);
    document.body.appendChild(fakeButton);
    document.body.appendChild(fakeToasterIcon);
    document.body.appendChild(fakeToasterTitle);
    document.body.appendChild(fakeToasterDetail);

    NotificationScreen.init();
  });

  teardown(function() {
    fakeNotifContainer.parentNode.removeChild(fakeNotifContainer);
    fakeLockScreenContainer.parentNode.removeChild(fakeLockScreenContainer);
    fakeToaster.parentNode.removeChild(fakeToaster);
    fakeButton.parentNode.removeChild(fakeButton);
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
        id: 'id-1'
      });

      assert.ok(NotificationScreen.addNotification.called);
      assert.equal(NotificationScreen.addNotification.args[0][0].id, 'id-1');
    });

    test('closing a notification', function() {
      sendChromeEvent({
        type: 'desktop-notification-close',
        id: 'id-1'
      });
      assert.ok(NotificationScreen.removeNotification.called);
      assert.equal(NotificationScreen.removeNotification.args[0][0], 'id-1');
    });
  });

  suite('updateStatusBarIcon >', function() {
    var realScreenManager;
    setup(function() {
      this.sinon.spy(MockStatusBar, 'updateNotification');
      realScreenManager = window.ScreenManager;
      window.ScreenManager = {
        screenEnabled: true,
        turnScreenOn: sinon.stub()
      };
      NotificationScreen.updateStatusBarIcon();
    });

    test('should update the icon in the status bar', function() {
      sinon.assert.called(MockStatusBar.updateNotification);
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

    function testNotificationWithDirection(dir) {
      var toasterTitle = NotificationScreen.toasterTitle;
      var imgpath = 'http://example.com/test.png';
      var detail = {icon: imgpath,
                    title: 'title',
                    detail: 'detail',
                    bidi: dir};
      NotificationScreen.addNotification(detail);
      assert.equal(dir, toasterTitle.dir);
    }

    test('calling addNotification with rtl direction', function() {
      testNotificationWithDirection('rtl');
    });

    test('calling addNotification with ltr direction', function() {
      testNotificationWithDirection('ltr');
    });

    test('calling addNotification with auto direction', function() {
      testNotificationWithDirection('auto');
    });

    test('calling addNotification without direction', function() {
      var toasterTitle = NotificationScreen.toasterTitle;
      var imgpath = 'http://example.com/test.png';
      var detail = {icon: imgpath, title: 'title', detail: 'detail'};
      NotificationScreen.addNotification(detail);
      assert.equal('auto', toasterTitle.dir);
    });

    test('calling addNotification with language', function() {
      var toasterTitle = NotificationScreen.toasterTitle;
      var imgpath = 'http://example.com/test.png';
      var detail = {icon: imgpath, title: 'title', lang: 'en'};
      NotificationScreen.addNotification(detail);
      assert.equal('en', toasterTitle.lang);
    });

    test('calling addNotification without language', function() {
      var toasterTitle = NotificationScreen.toasterTitle;
      var imgpath = 'http://example.com/test.png';
      var detail = {icon: imgpath, title: 'title'};
      NotificationScreen.addNotification(detail);
      assert.equal('undefined', toasterTitle.lang);
    });

    test('remove lockscreen notifications at the same time', function() {
      NotificationScreen.addNotification({
        id: 'id-10000', title: '', message: ''
      });
      NotificationScreen.removeNotification('id-10000');
      assert.equal(
        null,
        fakeLockScreenContainer.querySelector(
          '[data-notification-i-d="id-10000"]'));
    });

    teardown(function() {
      window.ScreenManager = realScreenManager;
    });
  });

  suite('differentiating api >', function() {
    test('identifying deprecated API', function() {
      var node = NotificationScreen.addNotification({
        id: 'app-notif-1',
        title: '',
        message: ''
      });
      assert.equal('true', node.dataset.obsoleteAPI);
    });

    test('identifying new API', function() {
      var node = NotificationScreen.addNotification({
        id: 'app://notif',
        title: '',
        message: ''
      });
      assert.equal('false', node.dataset.obsoleteAPI);
    });
  });

  suite('tap a notification >', function() {
    var notificationNode, notifClickedStub, contentEventStub;
    var details = {
      type: 'desktop-notification',
      id: 'id-1',
      title: '',
      message: ''
    };

    setup(function() {
      notificationNode = NotificationScreen.addNotification(details);

      notifClickedStub = sinon.stub();
      contentEventStub = sinon.stub();

      window.addEventListener('notification-clicked', notifClickedStub);
      window.addEventListener('mozContentEvent', contentEventStub);

      var event = new CustomEvent('tap', { bubbles: true, cancelable: true });
      notificationNode.dispatchEvent(event);
    });

    teardown(function() {
      window.removeEventListener('notification-clicked', notifClickedStub);
      window.removeEventListener('mozContentEvent', contentEventStub);
    });

    test('dispatch events once with the expected parameters', function() {
      sinon.assert.calledOnce(notifClickedStub);
      sinon.assert.calledOnce(contentEventStub);

      sinon.assert.calledWithMatch(notifClickedStub, {
        detail: {
          id: details.id
        }
      });

      sinon.assert.calledWithMatch(contentEventStub, {
        detail: {
          type: 'desktop-notification-click',
          id: details.id
        }
      });
    });
  });

});
