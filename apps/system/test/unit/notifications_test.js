/* global
  MocksHelper,
  MockStatusBar,
  Notifications,
  MockNavigatorMozChromeNotifications,
  MockNavigatorSettings
 */

'use strict';

require('/js/notifications.js');
require('/test/unit/mock_screen_manager.js');
require('/test/unit/mock_statusbar.js');
require('/test/unit/mock_utility_tray.js');
require('/test/unit/mock_navigator_moz_chromenotifications.js');
require('/shared/test/unit/mocks/mock_gesture_detector.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_settings_url.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/test/unit/mock_system.js');

var mocksForNotifications = new MocksHelper([
  'StatusBar',
  'GestureDetector',
  'NavigatorMozChromeNotifications',
  'ScreenManager',
  'NavigatorSettings',
  'SettingsListener',
  'SettingsURL',
  'UtilityTray',
  'System'
]).init();

suite('system/Notifications >', function() {
  var fakeNotifContainer, fakeToaster,
    fakeButton, fakeNoNotifications, fakeToasterIcon, fakeToasterTitle,
    fakeToasterDetail, fakeSomeNotifications, subject;

  function sendChromeNotificationEvent(detail) {
    var event = new CustomEvent('mozChromeNotificationEvent', {
      detail: detail
    });

    window.dispatchEvent(event);
  }

  mocksForNotifications.attachTestHelpers();
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

    fakeToaster = createFakeElement('div', 'notification-toaster');
    fakeSomeNotifications = createFakeElement('span', 'notification-some');
    fakeNoNotifications = createFakeElement('span', 'notification-none');
    fakeButton = createFakeElement('button', 'notification-clear');
    fakeToasterIcon = createFakeElement('img', 'toaster-icon');
    fakeToasterTitle = createFakeElement('div', 'toaster-title');
    fakeToasterDetail = createFakeElement('div', 'toaster-detail');

    document.body.appendChild(fakeNotifContainer);

    document.body.appendChild(fakeToaster);
    document.body.appendChild(fakeSomeNotifications);
    document.body.appendChild(fakeNoNotifications);
    document.body.appendChild(fakeButton);
    document.body.appendChild(fakeToasterIcon);
    document.body.appendChild(fakeToasterTitle);
    document.body.appendChild(fakeToasterDetail);

    subject = new Notifications();
    subject.start();
  });

  teardown(function() {
    fakeNotifContainer.parentNode.removeChild(fakeNotifContainer);
    fakeToaster.parentNode.removeChild(fakeToaster);
    fakeButton.parentNode.removeChild(fakeButton);
  });

  suite('chrome events >', function() {
    setup(function() {
      this.sinon.stub(subject, 'addNotification');
      this.sinon.stub(subject, 'removeNotification');
    });

    function sendChromeNotificationEvent(detail) {
      var event = new CustomEvent('mozChromeNotificationEvent', {
        detail: detail
      });

      window.dispatchEvent(event);
    }

    test('showing a notification', function() {
      sendChromeNotificationEvent({
        type: 'desktop-notification',
        id: 'id-1'
      });

      assert.ok(subject.addNotification.called);
      assert.equal(subject.addNotification.args[0][0].id, 'id-1');
    });

    test('closing a notification', function() {
      sendChromeNotificationEvent({
        type: 'desktop-notification-close',
        id: 'id-1'
      });
      assert.ok(subject.removeNotification.called);
      assert.equal(subject.removeNotification.args[0][0], 'id-1');
    });
  });

  suite('updateStatusBarIcon >', function() {
    setup(function() {
      this.sinon.spy(MockStatusBar, 'updateNotification');
      subject.updateStatusBarIcon();
    });

    test('should update the icon in the status bar', function() {
      sinon.assert.called(MockStatusBar.updateNotification);
      assert.equal(2, MockStatusBar.notificationsCount);
    });

    test('external notif should not be able to decrease the global count',
      function() {

      subject.decExternalNotifications();
      assert.equal(2, MockStatusBar.notificationsCount);
    });

    test('external notif should increase the global count',
      function() {

      subject.incExternalNotifications();
      assert.isTrue(MockStatusBar.mNotificationUnread);
      assert.equal(3, MockStatusBar.notificationsCount);
    });

    test('external notif should decrease the global count',
      function() {

      subject.incExternalNotifications();
      MockStatusBar.mNotificationUnread = false;
      subject.decExternalNotifications();
      assert.isFalse(MockStatusBar.mNotificationUnread);
      assert.equal(2, MockStatusBar.notificationsCount);
    });

    test('should change the read status', function() {
      subject.updateStatusBarIcon(true);
      assert.isTrue(MockStatusBar.mNotificationUnread);
    });

    test('calling addNotification without icon', function() {
      var toasterIcon = subject.toasterIcon;
      var imgpath = 'http://example.com/test.png';
      var detail = {icon: imgpath, title: 'title', detail: 'detail'};
      subject.addNotification(detail);
      assert.equal(imgpath, toasterIcon.src);
      assert.isFalse(toasterIcon.hidden);
      delete detail.icon;
      subject.addNotification(detail);
      assert.isTrue(toasterIcon.hidden);
    });

    function testNotificationWithDirection(dir) {
      var toasterTitle = subject.toasterTitle;
      var imgpath = 'http://example.com/test.png';
      var detail = {icon: imgpath,
                    title: 'title',
                    detail: 'detail',
                    bidi: dir};
      subject.addNotification(detail);
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
      var toasterTitle = subject.toasterTitle;
      var imgpath = 'http://example.com/test.png';
      var detail = {icon: imgpath, title: 'title', detail: 'detail'};
      subject.addNotification(detail);
      assert.equal('auto', toasterTitle.dir);
    });

    test('calling addNotification with language', function() {
      var toasterTitle = subject.toasterTitle;
      var imgpath = 'http://example.com/test.png';
      var detail = {icon: imgpath, title: 'title', lang: 'en'};
      subject.addNotification(detail);
      assert.equal('en', toasterTitle.lang);
    });

    test('calling addNotification without language', function() {
      var toasterTitle = subject.toasterTitle;
      var imgpath = 'http://example.com/test.png';
      var detail = {icon: imgpath, title: 'title'};
      subject.addNotification(detail);
      assert.equal('undefined', toasterTitle.lang);
    });

    test('calling addNotification with timestamp', function() {
      var timestamp = 1397802220000;
      var detail = {timestamp: timestamp};
      subject.addNotification(detail);
      var timestamps = document.getElementsByClassName('timestamp');
      assert.equal(timestamps.length, 1);
      var ts = timestamps[0].dataset.timestamp;
      assert.isTrue(typeof ts === 'string');
      var fromDate = new Date(ts).getTime();
      assert.equal(timestamp, fromDate);
    });

    test('calling addNotification without timestamp', function() {
      // we parseInt(date/1000)*1000 to make sure to remove some resolution
      // fromDate == 1397810684000 -- now == 1397810684105
      var now = parseInt(new Date().getTime() / 1000) * 1000;
      var detail = {timestamp: undefined};
      subject.addNotification(detail);
      var timestamps = document.getElementsByClassName('timestamp');
      assert.equal(timestamps.length, 1);
      var ts = timestamps[0].dataset.timestamp;
      assert.isTrue(typeof ts === 'string');
      var fromDate = new Date(ts).getTime();
      assert.isTrue(typeof fromDate === 'number');
      assert.isTrue(fromDate >= now);
    });

    suite('prettyDate() behavior >', function() {
      var realMozL10n;
      setup(function() {
        var mozL10nStub = {
          DateTimeFormat: function() {
            return {
              fromNow: function(time, compact) {
                var retval;
                var delta = new Date().getTime() - time.getTime();
                if (delta >= 0 && delta < 60*1000) {
                  retval = 'now';
                } else if (delta >= 60*1000) {
                  retval = '1m ago';
                }
                return retval;
              }
            };
          }
        };
        realMozL10n = navigator.mozL10n;
        navigator.mozL10n = mozL10nStub;
      });

      teardown(function() {
        navigator.mozL10n = realMozL10n;
      });

      test('converts timestamp to string', function() {
        var timestamp = new Date();
        var date = subject.prettyDate(timestamp);
        assert.isTrue(typeof date === 'string');
      });

      test('shows now', function() {
        var timestamp = new Date();
        var date = subject.prettyDate(timestamp);
        assert.equal(date, 'now');
      });

      test('shows 1m ago', function() {
        var timestamp = new Date(new Date().getTime() - 61*1000);
        var date = subject.prettyDate(timestamp);
        assert.equal(date, '1m ago');
      });
    });
  });

  suite('differentiating api >', function() {
    test('identifying deprecated API', function() {
      var node = subject.addNotification({
        id: 'app-notif-1',
        title: '',
        message: ''
      });
      assert.equal('true', node.dataset.obsoleteAPI);
    });

    test('identifying new API', function() {
      var node = subject.addNotification({
        id: 'app://notif',
        title: '',
        message: ''
      });
      assert.equal('false', node.dataset.obsoleteAPI);
    });
  });

  suite('tap a notification >', function() {
    var notificationNode, notifClickedStub, contentNotificationEventStub;
    var details = {
      type: 'desktop-notification',
      id: 'id-1',
      title: '',
      message: ''
    };

    setup(function() {
      notificationNode = subject.addNotification(details);

      notifClickedStub = sinon.stub();
      contentNotificationEventStub = sinon.stub();

      window.addEventListener('notification-clicked', notifClickedStub);
      window.addEventListener(
        'mozContentNotificationEvent', contentNotificationEventStub);

      var event = new CustomEvent('tap', { bubbles: true, cancelable: true });
      notificationNode.dispatchEvent(event);
    });

    teardown(function() {
      window.removeEventListener('notification-clicked', notifClickedStub);
      window.removeEventListener(
        'mozContentNotificationEvent', contentNotificationEventStub);
    });

    test('dispatch events once with the expected parameters', function() {
      sinon.assert.calledOnce(notifClickedStub);
      sinon.assert.calledOnce(contentNotificationEventStub);

      sinon.assert.calledWithMatch(notifClickedStub, {
        detail: {
          id: details.id
        }
      });

      sinon.assert.calledWithMatch(contentNotificationEventStub, {
        detail: {
          type: 'desktop-notification-click',
          id: details.id
        }
      });
    });
  });

  suite('tap a notification using the obsolete API >', function() {
    var notificationNode, notifClickedStub, contentNotificationEventStub;
    var details = {
      type: 'desktop-notification',
      id: 'app-notif-1',
      title: '',
      message: ''
    };

    setup(function() {
      notificationNode = subject.addNotification(details);

      notifClickedStub = sinon.stub();
      contentNotificationEventStub = sinon.stub();

      window.addEventListener('notification-clicked', notifClickedStub);
      window.addEventListener(
        'mozContentNotificationEvent', contentNotificationEventStub);
    });

    teardown(function() {
      window.removeEventListener('notification-clicked', notifClickedStub);
      window.removeEventListener(
        'mozContentNotificationEvent', contentNotificationEventStub);
    });

    test('tapping on the notification', function() {
      var event = new CustomEvent('tap', { bubbles: true, cancelable: true });
      notificationNode.dispatchEvent(event);

      sinon.assert.calledOnce(notifClickedStub);
      sinon.assert.calledTwice(contentNotificationEventStub);

      sinon.assert.calledWithMatch(notifClickedStub, {
        detail: {
          id: details.id
        }
      });

      sinon.assert.calledWithMatch(contentNotificationEventStub, {
        detail: {
          type: 'desktop-notification-click',
          id: details.id
        }
      });

      sinon.assert.calledWithMatch(contentNotificationEventStub, {
        detail: {
          type: 'desktop-notification-close',
          id: details.id
        }
      });
    });

    test('tapping on the toaster', function() {
      var event = new CustomEvent('tap', { bubbles: true, cancelable: true });
      fakeToaster.dispatchEvent(event);

      sinon.assert.calledOnce(notifClickedStub);
      sinon.assert.calledTwice(contentNotificationEventStub);

      sinon.assert.calledWithMatch(notifClickedStub, {
        detail: {
          id: details.id
        }
      });

      sinon.assert.calledWithMatch(contentNotificationEventStub, {
        detail: {
          type: 'desktop-notification-click',
          id: details.id
        }
      });

      sinon.assert.calledWithMatch(contentNotificationEventStub, {
        detail: {
          type: 'desktop-notification-close',
          id: details.id
        }
      });
    });
  });

  suite('resending notifications >', function() {
    var realMozSettings;
    var realNavigatorMozChromeNotifications;

    suiteSetup(function() {
      realMozSettings = navigator.mozSettings;
      window.navigator.mozSettings = MockNavigatorSettings;

      realNavigatorMozChromeNotifications = navigator.mozChromeNotifications;
      navigator.mozChromeNotifications = MockNavigatorMozChromeNotifications;
    });

    suiteTeardown(function() {
      navigator.mozSettings = realMozSettings;
      navigator.mozChromeNotifications = realNavigatorMozChromeNotifications;
    });

    suite('inhibition of vibration and sound >', function() {
      var vibrateSpy;

      function sendNotification() {
        var imgpath = 'http://example.com/test.png';
        var detail = {icon: imgpath, title: 'title', detail: 'detail'};
        subject.addNotification(detail);
      }

      setup(function() {
        vibrateSpy = this.sinon.spy(navigator, 'vibrate');
        this.sinon.useFakeTimers();
      });

      test('isResending is false', function() {
        assert.isFalse(subject.isResending);
      });

      test('isResending is switched to true when receiving resend event',
        function() {
          assert.isFalse(subject.isResending);
          window.dispatchEvent(
            new CustomEvent('desktop-notification-resend',
            { detail: { number: 1 } } ));
          this.sinon.clock.tick();
          assert.isTrue(subject.isResending);
        }
      );

      test('isResending is switched to false when receiving a notification',
        function() {
          // Since we instance it everytime, it would be default value (false).
          subject.isResending = true;
          window.dispatchEvent(
            new CustomEvent('desktop-notification-resend',
            { detail: { number: 1 } } ));
          this.sinon.clock.tick();
          sendChromeNotificationEvent({
            type: 'desktop-notification',
            id: 'id-1'
          });
          this.sinon.clock.tick(1000);
          assert.isFalse(subject.isResending);
        }
      );

      test('isResending true blocks vibrate()', function() {
        subject.isResending = true;
        assert.isTrue(subject.isResending);

        sendNotification();
        this.sinon.clock.tick(1000);
        assert.ok(vibrateSpy.notCalled);
      });

      test('isResending false allows vibrate()', function() {
        subject.isResending = false;
        assert.isFalse(subject.isResending);

        sendNotification();
        this.sinon.clock.tick(1000);
        assert.ok(vibrateSpy.called);
      });
    });
  });

});
