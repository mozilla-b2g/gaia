/* global MockAudio,
  MockL10n,
  MockNavigatorMozChromeNotifications,
  MockNavigatorSettings,
  MocksHelper,
  NotificationScreen,
  MockNavigatorMozTelephony,
  MockCall,
  MockService
 */

'use strict';

require('/test/unit/mock_utility_tray.js');
require('/test/unit/mock_navigator_moz_chromenotifications.js');
require('/test/unit/mock_version_helper.js');
require('/test/unit/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_navigator_moz_telephony.js');
require('/shared/test/unit/mocks/dialer/mock_call.js');
require('/shared/test/unit/mocks/mock_settings_url.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/shared/test/unit/mocks/mock_service.js');
require('/shared/test/unit/mocks/mock_audio.js');

var mocksForNotificationScreen = new MocksHelper([
  'Audio',
  'NavigatorMozChromeNotifications',
  'NavigatorSettings',
  'SettingsListener',
  'SettingsURL',
  'Service',
  'LazyLoader'
]).init();

suite('system/NotificationScreen >', function() {
  var fakeDesktopNotifContainer, fakeLockScreenContainer, fakeToaster,
    fakeButton, fakeNoNotifications, fakeToasterIcon, fakeToasterTitle,
    fakeToasterDetail, fakeSomeNotifications, fakeAmbientIndicator,
    fakeNotifContainer;
  var fakePriorityNotifContainer, fakeOtherNotifContainer;
  var realMozL10n;
  var isDocumentHidden;

  function sendChromeNotificationEvent(detail) {
    var event = new CustomEvent('mozChromeNotificationEvent', {
      detail: detail
    });

    window.dispatchEvent(event);
  }

  function createFakeElement(tag, id) {
    var obj = document.createElement(tag);
    obj.id = id;
    return obj;
  }

  function fakeNotification() {
    var elt = document.createElement('div');
    elt.className = 'notification';

    return elt;
  }

  function incrementNotications(number) {
    for (var i = 0; i <= number - 1; i++) {
      NotificationScreen.addUnreadNotification(i);
    }
  }


  mocksForNotificationScreen.attachTestHelpers();
  setup(function(done) {
    window.MediaPlaybackWidget = function() {};
    fakeDesktopNotifContainer = document.createElement('div');
    fakeDesktopNotifContainer.id = 'desktop-notifications-container';
    Object.defineProperty(fakeDesktopNotifContainer, 'clientWidth', {
      configurable: true,
      get: function() { return 320; }
    });
    fakeNotifContainer = document.createElement('div');
    fakeNotifContainer.id = 'notifications-container';
    fakePriorityNotifContainer = document.createElement('div');
    fakePriorityNotifContainer.className = 'priority-notifications';
    fakeOtherNotifContainer = document.createElement('div');
    fakeOtherNotifContainer.className = 'other-notifications';
    fakeDesktopNotifContainer.appendChild(fakePriorityNotifContainer);
    fakeDesktopNotifContainer.appendChild(fakeOtherNotifContainer);

    // add some children, we don't care what they are
    fakeOtherNotifContainer.appendChild(fakeNotification());
    fakeOtherNotifContainer.appendChild(fakeNotification());

    fakeLockScreenContainer = createFakeElement('div',
      'notifications-lockscreen-container');
    fakeToaster = createFakeElement('div', 'notification-toaster');
    fakeSomeNotifications = createFakeElement('span', 'notification-some');
    fakeNoNotifications = createFakeElement('span', 'notification-none');
    fakeButton = createFakeElement('button', 'notification-clear');
    fakeAmbientIndicator = createFakeElement('div', 'ambient-indicator');
    fakeToasterIcon = createFakeElement('img', 'toaster-icon');
    fakeToasterTitle = createFakeElement('div', 'toaster-title');
    fakeToasterDetail = createFakeElement('div', 'toaster-detail');

    document.body.appendChild(fakeDesktopNotifContainer);
    document.body.appendChild(fakeNotifContainer);

    document.body.appendChild(fakeLockScreenContainer);
    document.body.appendChild(fakeToaster);
    document.body.appendChild(fakeSomeNotifications);
    document.body.appendChild(fakeNoNotifications);
    document.body.appendChild(fakeButton);
    document.body.appendChild(fakeAmbientIndicator);
    document.body.appendChild(fakeToasterIcon);
    document.body.appendChild(fakeToasterTitle);
    document.body.appendChild(fakeToasterDetail);

    realMozL10n = navigator.mozL10n;
    MockL10n.DateTimeFormat = function() {
      return {
        fromNow: function(time, compact) {
          var retval;
          var delta = new Date().getTime() - time.getTime();
          if (delta >= 0 && delta < 60 * 1000) {
            retval = 'now';
          } else if (delta >= 60 * 1000) {
            retval = '1m ago';
          }
          return retval;
        }
      };
    };
    navigator.mozL10n = MockL10n;

    isDocumentHidden = false;
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => isDocumentHidden
    });

    this.sinon.useFakeTimers();
    require('/js/notification_screen.js', function() {
      NotificationScreen.start();
      done();
    });
  });

  teardown(function() {
    delete window.MediaPlaybackWidget;
    // real document.hidden is in a prototype, so we can just delete it.
    delete document.hidden;

    fakeDesktopNotifContainer.parentNode.removeChild(fakeDesktopNotifContainer);
    fakeLockScreenContainer.parentNode.removeChild(fakeLockScreenContainer);
    fakeToaster.parentNode.removeChild(fakeToaster);
    fakeButton.parentNode.removeChild(fakeButton);

    navigator.mozL10n = realMozL10n;
  });

  suite('chrome events >', function() {
    setup(function() {
      this.sinon.stub(NotificationScreen, 'addNotification');
      this.sinon.stub(NotificationScreen, 'removeNotification');
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

      assert.ok(NotificationScreen.addNotification.called);
      assert.equal(NotificationScreen.addNotification.args[0][0].id, 'id-1');
    });

    test('closing a notification', function() {
      sendChromeNotificationEvent({
        type: 'desktop-notification-close',
        id: 'id-1'
      });
      assert.ok(NotificationScreen.removeNotification.called);
      assert.equal(NotificationScreen.removeNotification.args[0][0], 'id-1');
    });
  });

  suite('playing notification ringtone', function() {
    var realMozTelephony;

    function sendNotification() {
      var imgpath = 'http://example.com/test.png';
      var detail = {icon: imgpath, title: 'title', detail: 'detail'};
      NotificationScreen.addNotification(detail);
    }

    suiteSetup(function() {
      realMozTelephony = navigator.mozTelephony;
      navigator.mozTelephony = MockNavigatorMozTelephony;
    });

    suiteTeardown(function() {
      MockNavigatorMozTelephony.mSuiteTeardown();
      navigator.mozTelephony = realMozTelephony;
    });

    setup(function() {
      MockNavigatorMozTelephony.active = null;
      MockNavigatorMozTelephony.calls = [];
      MockNavigatorMozTelephony.conferenceGroup.state = null;
    });

    test('it should play it by default on notification channel', function() {
      var playSpy = this.sinon.spy(MockAudio.prototype, 'play');
      sendNotification();
      var mockAudio = MockAudio.instances[0];
      assert.equal(mockAudio.mozAudioChannelType, 'notification');
      assert.ok(playSpy.calledOnce);
    });

    test('it should stop playing after 4 seconds', function() {
      var pauseSpy = this.sinon.spy(MockAudio.prototype, 'pause');
      var loadSpy =  this.sinon.spy(MockAudio.prototype, 'load');
      var removeAttributeSpy = this.sinon.spy(
        MockAudio.prototype, 'removeAttribute');
      sendNotification();
      sinon.assert.notCalled(pauseSpy);
      this.sinon.clock.tick(4000);
      sinon.assert.called(loadSpy);
      sinon.assert.calledWith(removeAttributeSpy, 'src');
      sinon.assert.called(pauseSpy);
    });

    test('if active call it should use telephony channel', function() {
      var playSpy = this.sinon.spy(MockAudio.prototype, 'play');
      var mockCall = new MockCall('123456', 'connected');
      MockNavigatorMozTelephony.active = mockCall;
      sendNotification();
      var mockAudio = MockAudio.instances[0];
      assert.equal(mockAudio.mozAudioChannelType, 'telephony');
      assert.ok(playSpy.calledOnce);
    });
  });

  suite('updateNotificationIndicator >', function() {
    setup(function() {
      NotificationScreen.updateNotificationIndicator();
    });

    test('should clear unread notifications after open tray', function() {
      incrementNotications(2);
      assert.equal(NotificationScreen.unreadNotifications.length, 2);

      var l10nAttrs = navigator.mozL10n.getAttributes(
        NotificationScreen.ambientIndicator);
      assert.deepEqual(l10nAttrs.args, { n : 2 });
      var event = new CustomEvent('utilitytrayshow');
      window.dispatchEvent(event);
      assert.equal(document.body.getElementsByClassName('unread').length, 0);
      assert.equal(NotificationScreen.unreadNotifications.length, 0);
      assert.isNull(NotificationScreen.ambientIndicator.getAttribute(
        'aria-label'));
    });

    test('should change the read status', function() {
      incrementNotications(1);
      assert.equal(document.body.getElementsByClassName('unread').length, 1);
      var l10nAttrs = navigator.mozL10n.getAttributes(
        NotificationScreen.ambientIndicator);
      assert.deepEqual(l10nAttrs.args, { n : 1 });
    });

    test('should not increment if the tray is open', function() {
      MockService.mockQueryWith('UtilityTray.shown', true);
      incrementNotications(1);
      assert.equal(document.body.getElementsByClassName('unread').length, 0);
      assert.isNull(NotificationScreen.ambientIndicator.getAttribute(
        'aria-label'));
    });

    test('should not show ambient indicator if FTU is running', function() {
      MockService.mockQueryWith('isFtuRunning', true);
      incrementNotications(1);
      assert.isFalse(NotificationScreen.ambientIndicator.classList.
        contains('unread'));
    });

    test('should update notification indicator when the FTU is done',
      function() {
        this.sinon.stub(NotificationScreen, 'updateNotificationIndicator');
        window.dispatchEvent(new CustomEvent('ftudone'));
        assert.isTrue(NotificationScreen.updateNotificationIndicator.called);
    });

    test('should not clear the ambient after decrement unread', function() {
      var imgpath = 'http://example.com/test.png';
      var detail = {
        id: 'my-id',
        icon: imgpath,
        title: 'title',
        detail: 'detail'
      };
      NotificationScreen.addNotification(detail);
      assert.equal(NotificationScreen.unreadNotifications.length, 1);
      assert.isNull(NotificationScreen.ambientIndicator.getAttribute(
        'aria-label'));
      NotificationScreen.removeUnreadNotification('other-id');
      assert.equal(NotificationScreen.unreadNotifications.length, 1);
      var l10nAttrs = navigator.mozL10n.getAttributes(
        NotificationScreen.ambientIndicator);
      assert.deepEqual(l10nAttrs.args, { n : 1 });
    });

  });

  suite('addUnreadNotification', function() {
    setup(function() {
      sinon.spy(NotificationScreen, 'updateNotificationIndicator');
    });

    teardown(function() {
      NotificationScreen.updateNotificationIndicator.restore();
    });

    test('should update the notifications indicator', function() {
      NotificationScreen.addUnreadNotification();
      assert.isTrue(NotificationScreen.updateNotificationIndicator.called);
    });

    test('shouldnt update the notif indicator when skipping', function() {
      NotificationScreen.addUnreadNotification('other-id', true);
      assert.isFalse(NotificationScreen.updateNotificationIndicator.called);
    });
  });

  suite('addNotification >', function() {
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

    test('doesnt update the ambient indicator', function() {
      sinon.spy(NotificationScreen, 'updateNotificationIndicator');
      var imgpath = 'http://example.com/test.png';
      var detail = {icon: imgpath, title: 'title', detail: 'detail'};
      NotificationScreen.addNotification(detail);
      assert.isFalse(NotificationScreen.updateNotificationIndicator.called);
      NotificationScreen.updateNotificationIndicator.restore();
    });

    function testNotificationWithDirection(dir) {
      var toaster = NotificationScreen.toaster;
      var imgpath = 'http://example.com/test.png';
      var detail = {icon: imgpath,
                    title: 'title',
                    detail: 'detail',
                    dir: dir};
      NotificationScreen.addNotification(detail);
      assert.equal(dir, toaster.dir);
      var notificationNode =
        document.getElementsByClassName('notification')[0];
      var notificationNodeTitle =
        document.querySelector('.notification .title-container .title');
      var notificationNodeDetail =
        document.querySelector('.notification .detail');
      assert.equal(dir, notificationNode.dataset.predefinedDir);
      assert.equal('auto', notificationNodeTitle.dir);
      assert.equal('auto', notificationNodeDetail
        .querySelector('.detail-content').dir);
    }

    test('calling addNotification with rtl direction', function() {
      testNotificationWithDirection('rtl');
    });

    test('calling addNotification with ltr direction', function() {
      testNotificationWithDirection('ltr');
    });

    test('calling addNotification with auto direction', function() {
      testNotificationWithDirection('');
    });

    test('calling addNotification without direction', function() {
      var toaster = NotificationScreen.toaster;
      var imgpath = 'http://example.com/test.png';
      var detail = {icon: imgpath, title: 'title', detail: 'detail'};
      NotificationScreen.addNotification(detail);
      assert.equal('', toaster.dir);
    });

    test('calling addNotification with language', function() {
      var toaster = NotificationScreen.toaster;
      var imgpath = 'http://example.com/test.png';
      var detail = {icon: imgpath, title: 'title', lang: 'en'};
      NotificationScreen.addNotification(detail);
      assert.equal('en', toaster.lang);
    });

    test('calling addNotification without language', function() {
      var toaster = NotificationScreen.toaster;
      var imgpath = 'http://example.com/test.png';
      var detail = {icon: imgpath, title: 'title'};
      NotificationScreen.addNotification(detail);
      assert.equal('undefined', toaster.lang);
    });

    test('calling addNotification with timestamp', function() {
      var timestamp = 1397802220000;
      var detail = {timestamp: timestamp};
      NotificationScreen.addNotification(detail);
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
      NotificationScreen.addNotification(detail);
      var timestamps = document.getElementsByClassName('timestamp');
      assert.equal(timestamps.length, 1);
      var ts = timestamps[0].dataset.timestamp;
      assert.isTrue(typeof ts === 'string');
      var fromDate = new Date(ts).getTime();
      assert.isTrue(typeof fromDate === 'number');
      assert.isTrue(fromDate >= now);
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

    test('removes the unread notificaction', function() {
      var id = 'id-10000';
      sinon.stub(NotificationScreen, 'removeUnreadNotification');
      NotificationScreen.addNotification({
        id: id, title: '', message: ''
      });
      NotificationScreen.removeNotification(id);
      var expect = NotificationScreen.removeUnreadNotification.calledWith(id);
      assert.isTrue(expect);
    });

    test('does notify for generic applications', function() {
      this.sinon.stub(navigator, 'vibrate');
      this.sinon.stub(MockAudio.prototype, 'play');

      NotificationScreen.addNotification({
        id: 'id-10000',
        title: '',
        message: '',
        manifestURL: 'app://sms.gaiamobile.org/manifest.webapp'
      });

      var ringtonePlayer = MockAudio.instances[0];
      sinon.assert.called(ringtonePlayer.play);

      sinon.assert.called(navigator.vibrate);

      assert.ok(fakeToaster.classList.contains('displayed'));
    });

    test('notifications are added in the right place', function() {
      var title = 'hello world';
      var text = 'how are you';
      NotificationScreen.addNotification({
        id: 'id-10000',
        title: title,
        text: text,
        manifestURL: 'app://sms.gaiamobile.org/manifest.webapp'
      });

      assert.equal(fakeOtherNotifContainer.childElementCount, 3);
      var newContent = fakeOtherNotifContainer.firstElementChild.textContent;
      assert.isTrue(
        newContent.indexOf(title) !== -1,
        'The title is in the notification'
      );
      assert.isTrue(
        newContent.indexOf(text) !== -1,
        'The message is in the notification'
      );
    });

    test('does not notify for the network-alerts application', function() {
      this.sinon.stub(navigator, 'vibrate');

      NotificationScreen.addNotification({
        id: 'id-10000',
        title: '',
        message: '',
        // note: works only if the test agent is launched using
        // app://test-agent.gaiamobile.org (instead of using http://)
        manifestURL:
          window.location.origin.replace('system.', 'network-alerts.') +
          '/manifest.webapp'
      });

      assert.lengthOf(MockAudio.instances, 0);
      sinon.assert.notCalled(navigator.vibrate);
      assert.isFalse(fakeToaster.classList.contains('displayed'));
    });

    test('notifications for priority applications are added in right place',
    function() {
      var title = 'hello world';
      var text = 'how are you';
      NotificationScreen.addNotification({
        id: 'id-10000',
        title: title,
        text: text,
        // note: works only if the test agent is launched using
        // app://test-agent.gaiamobile.org (instead of using http://)
        manifestURL:
          window.location.origin.replace('system.', 'network-alerts.') +
          '/manifest.webapp'
      });

      assert.equal(fakePriorityNotifContainer.childElementCount, 1);
      var content = fakePriorityNotifContainer.firstElementChild.textContent;
      assert.isTrue(
        content.indexOf(title) !== -1,
        'The title is in the notification'
      );
      assert.isTrue(
        content.indexOf(text) !== -1,
        'The message is in the notification'
      );
    });
  });

  suite('prettyDate() behavior >', function() {
    test('converts timestamp to string', function() {
      var timestamp = new Date();
      var date = NotificationScreen.prettyDate(timestamp);
      assert.isTrue(typeof date === 'string');
    });

    test('shows now', function() {
      var timestamp = new Date();
      var date = NotificationScreen.prettyDate(timestamp);
      assert.equal(date, 'now');
    });

    test('shows 1m ago', function() {
      var timestamp = new Date(new Date().getTime() - 61 * 1000);
      var date = NotificationScreen.prettyDate(timestamp);
      assert.equal(date, '1m ago');
    });
  });

  suite('special notification handling for special apps', function() {
    var CALENDAR_MANIFEST = 'app://calendar.gaiamobile.org/manifest.webapp';
    var EMAIL_MANIFEST = 'app://email.gaiamobile.org/manifest.webapp';

    var details = {
      id: 'id-' + Date.now(),
      title: 'title',
      text: 'body'
    };

    var turnOnScreenSpy;

    setup(function() {
      turnOnScreenSpy = this.sinon.spy(MockService, 'request');
    });

    test('calendar notifications should wake the screen', function() {
      details.manifestURL = CALENDAR_MANIFEST;
      NotificationScreen.addNotification(details);
      sinon.assert.calledOnce(MockService.request.withArgs('turnScreenOn'));
    });

    test('email notifications should not wake screen', function() {
      details.mozbehavior = { noscreen: true };
      details.manifestURL = EMAIL_MANIFEST;
      NotificationScreen.addNotification(details);
      sinon.assert.notCalled(MockService.request.withArgs('turnScreenOn'));
    });

    test('download progress notifications should not wake screen', function() {
      details.mozbehavior = { noscreen: true };
      details.manifestURL = null;
      details.type = 'download-notification-downloading';
      NotificationScreen.addNotification(details);
      sinon.assert.notCalled(MockService.request);
    });

    test('download complete notifications should wake screen', function() {
      details.mozbehavior = undefined;
      details.manifestURL = null;
      details.type = 'download-notification-complete';
      NotificationScreen.addNotification(details);
      sinon.assert.calledOnce(MockService.request);
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
    var notificationNode, notifClickedStub, contentNotificationEventStub;
    var details = {
      type: 'desktop-notification',
      id: 'id-1',
      title: '',
      message: ''
    };

    setup(function() {
      notificationNode = NotificationScreen.addNotification(details);

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

  suite('swiping to dismiss >', function() {
    var notificationNode, notifClickedStub, contentNotificationEventStub;
    var details = {
      type: 'desktop-notification',
      id: 'id-1',
      title: '',
      message: ''
    };

    setup(function() {
      notificationNode = NotificationScreen.addNotification(details);

      notifClickedStub = sinon.stub();
      contentNotificationEventStub = sinon.stub();

      window.addEventListener('notification-clicked', notifClickedStub);
      window.addEventListener(
        'mozContentNotificationEvent', contentNotificationEventStub);
    });

    function fakeEvt(x, y) {
      return {
        timeStamp: Date.now(),
        preventDefault: function() {},
        touches: [{
          target: notificationNode,
          pageX: x,
          pageY: y
        }]
      };
    }

    test('should disable scrolling during a swipe', function() {
      var overflow = NotificationScreen.notificationsContainer.style.overflow;
      assert.equal(overflow, '');

      NotificationScreen.touchstart(fakeEvt(1, 1));
      NotificationScreen.touchmove(fakeEvt(45, 1));
      overflow = NotificationScreen.notificationsContainer.style.overflow;
      assert.equal(overflow, 'hidden');

      NotificationScreen.touchend(fakeEvt(45, 1));
      overflow = NotificationScreen.notificationsContainer.style.overflow;
      assert.equal(overflow, '');
    });

    test('should account for speed when dismissing', function() {
      // Short but fast swipe
      var close = this.sinon.stub(NotificationScreen, 'swipeCloseNotification');
      NotificationScreen.touchstart(fakeEvt(1, 1));
      this.sinon.clock.tick(10);
      NotificationScreen.touchmove(fakeEvt(25, 1));
      this.sinon.clock.tick(20);
      NotificationScreen.touchmove(fakeEvt(45, 1));
      this.sinon.clock.tick(30);
      NotificationScreen.touchend(fakeEvt(45, 1));

      sinon.assert.calledOnce(close);
      var arg = close.getCall(0).args[0];
      assert.isTrue(arg < NotificationScreen.TRANSITION_DURATION);
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
      notificationNode = NotificationScreen.addNotification(details);

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
        NotificationScreen.addNotification(detail);
      }

      setup(function() {
        vibrateSpy = this.sinon.spy(navigator, 'vibrate');
      });

      test('isResending is false', function() {
        assert.isFalse(NotificationScreen.isResending);
      });

      test('isResending is switched to true when receiving resend event',
        function() {
          assert.isFalse(NotificationScreen.isResending);
          window.dispatchEvent(
            new CustomEvent('desktop-notification-resend',
            { detail: { number: 1 } }));
          this.sinon.clock.tick();
          assert.isTrue(NotificationScreen.isResending);
        }
      );

      test('isResending is switched to false when receiving a notification',
        function() {
          assert.isTrue(NotificationScreen.isResending);
          window.dispatchEvent(
            new CustomEvent('desktop-notification-resend',
            { detail: { number: 1 } }));
          this.sinon.clock.tick();
          sendChromeNotificationEvent({
            type: 'desktop-notification',
            id: 'id-1'
          });
          this.sinon.clock.tick(1000);
          assert.isFalse(NotificationScreen.isResending);
        }
      );

      test('isResending true blocks vibrate()', function() {
        NotificationScreen.isResending = true;
        assert.isTrue(NotificationScreen.isResending);

        sendNotification();
        this.sinon.clock.tick(1000);
        assert.ok(vibrateSpy.notCalled);
      });

      test('isResending false allows vibrate()', function() {
        NotificationScreen.isResending = false;
        assert.isFalse(NotificationScreen.isResending);

        sendNotification();
        this.sinon.clock.tick(1000);
        assert.ok(vibrateSpy.called);
      });
    });

    suite('on restart >', function() {
      var dispatchEventSpy, resendSpy;
      var setting = 'notifications.resend';

      setup(function() {
        resendSpy = this.sinon.spy(MockNavigatorMozChromeNotifications,
          'mozResendAllNotifications');
        dispatchEventSpy = this.sinon.spy(window, 'dispatchEvent');
      });

      suite('setting is true >', function() {
        setup(function() {
          MockNavigatorSettings.mSettings[setting] = true;
          window.dispatchEvent(new CustomEvent('load'));
        });

        test('mozResendAllNotifications called', function() {
          this.sinon.clock.tick();
          assert.ok(resendSpy.calledOnce);
        });

        test('desktop-notification-resend sent', function() {
          this.sinon.clock.tick();
          var expectedEvent =
            new CustomEvent('desktop-notification-resend',
              { detail: { number: 1 } });
          assert.ok(dispatchEventSpy.called);
          assert.equal(
            dispatchEventSpy.lastCall.args[0].type, expectedEvent.type);
          assert.equal(
            dispatchEventSpy.lastCall.args[0].detail.number,
            expectedEvent.detail.number);
        });
      });

      suite('setting is false >', function() {
        setup(function() {
          MockNavigatorSettings.mSettings[setting] = false;
          window.dispatchEvent(new CustomEvent('load'));
        });

        test('mozResendAllNotifications not called', function() {
          assert.ok(resendSpy.notCalled);
        });

        test('desktop-notification-resend not sent', function() {
          var expectedEvent =
            new CustomEvent('desktop-notification-resend',
              { detail: { number: 1 } });
          assert.ok(dispatchEventSpy.called);
          assert.notEqual(
            dispatchEventSpy.lastCall.args[0].type, expectedEvent.type);
        });
      });
    });
  });
});
