/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global loadBodyHTML, mocha, MockL10n, MockMessageDB, MockNavigatormozApps,
          MockNavigatormozSetMessageHandler, MockNavigatorSettings,
          MockNotification, MockNotificationHelper, MocksHelper, ParsedMessage,
          WapPushManager */

'use strict';

mocha.globals(['close']);

requireApp('wappush/shared/test/unit/mocks/mock_navigator_moz_apps.js');
requireApp(
  'wappush/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js'
);
requireApp('wappush/shared/test/unit/mocks/mock_notification.js');
requireApp('wappush/shared/test/unit/mocks/mock_notification_helper.js');
requireApp('wappush/shared/test/unit/mocks/mock_navigator_moz_settings.js');

requireApp('wappush/js/cp_screen_helper.js');
requireApp('wappush/js/parsed_message.js');
requireApp('wappush/js/provisioning.js');
requireApp('wappush/js/si_sl_screen_helper.js');
requireApp('wappush/js/utils.js');
requireApp('wappush/js/wappush.js');

requireApp('wappush/test/unit/mock_l10n.js');
requireApp('wappush/test/unit/mock_link_action_handler.js');
requireApp('wappush/test/unit/mock_messagedb.js');
requireApp('wappush/test/unit/mock_whitelist.js');

var mocksHelperWapPush = new MocksHelper([
  'LinkActionHandler',
  'MessageDB',
  'NotificationHelper',
  'Notification',
  'WhiteList'
]).init();

suite('WAP Push', function() {
  var realMozApps;
  var realMozSettings;
  var realSetMessageHandler;
  var realMozL10n;

  mocksHelperWapPush.attachTestHelpers();

  suiteSetup(function() {
    realMozApps = navigator.mozApps;
    navigator.mozApps = MockNavigatormozApps;

    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    realSetMessageHandler = navigator.mozSetMessageHandler;
    navigator.mozSetMessageHandler = MockNavigatormozSetMessageHandler;
  });

  suiteTeardown(function() {
    navigator.mozApps = realMozApps;
    navigator.mozL10n = realMozL10n;
    navigator.mozSettings = realMozSettings;
    navigator.mozSetMessageHandler = realSetMessageHandler;
  });

  setup(function() {
    var notificationGetStub = function notificationGet() {
      var options = {};
      options.icon = 'icon';
      options.tag = '0';
      return {
        then: function(onSuccess, onError, onProgress) {
          onSuccess([
            new MockNotification('1', options)
          ]);
        }
      };
    };
    this.sinon.stub(MockNotification, 'get', notificationGetStub);

    mocksHelperWapPush.setup();
    MockNavigatorSettings.createLock().set({ 'wap.push.enabled': 'true' });
    loadBodyHTML('/index.html');
  });

  teardown(function() {
    MockNavigatormozApps.mTeardown();
    MockNavigatorSettings.mTeardown();
    mocksHelperWapPush.teardown();
  });

  suite('init', function() {
    setup(function(done) {
      MockNavigatormozSetMessageHandler.mSetup();
      WapPushManager.init(done);
    });

    teardown(function() {
      MockNavigatormozSetMessageHandler.mTeardown();
    });

    test('the message handlers are bound', function() {
      var handlers = MockNavigatormozSetMessageHandler.mMessageHandlers;
      assert.ok(handlers.notification);
      assert.ok(handlers['wappush-received']);
    });
  });

  suite('unsupported message', function() {
    var message = {
      sender: '+31641600986',
      contentType: 'text/foobar',
      content: ''
    };

    setup(function(done) {
      MockNavigatormozSetMessageHandler.mSetup();
      WapPushManager.init(done);
    });

    suiteTeardown(function() {
      MockNavigatormozSetMessageHandler.mTeardown();
    });

    test('unsupported messages are discarded', function() {
      var putSpy = this.sinon.spy(MockMessageDB, 'put');
      MockNavigatormozSetMessageHandler.mTrigger('wappush-received', message);
      assert.isTrue(putSpy.notCalled);
    });
  });

  suite('receiving and displaying a message', function() {
    // UI elements
    var screen;
    var closeButton;
    var title;
    var container;
    var text;
    var link;

    var message = {
      sender: '+31641600986',
      contentType: 'text/vnd.wap.si',
      content: '<si><indication href="http://www.mozilla.org">' +
               'check this out</indication></si>'
    };

    setup(function(done) {
      MockNavigatormozSetMessageHandler.mSetup();
      WapPushManager.init(done);
    });

    teardown(function() {
      MockNavigatormozApps.mTeardown();
      MockNavigatormozSetMessageHandler.mTeardown();
    });

    test('the notification is sent', function() {
      var notificationSpy = this.sinon.spy(window, 'Notification');
      MockNavigatormozSetMessageHandler.mTrigger('wappush-received', message);
      MockNavigatormozApps.mTriggerLastRequestSuccess();
      assert.isTrue(notificationSpy.calledOnce);
    });

    test('Notification.get() called with correct tag', function() {
      MockNavigatormozSetMessageHandler.mTrigger('wappush-received', message);
      MockNavigatormozApps.mTriggerLastRequestSuccess();
      WapPushManager.displayWapPushMessage(0);
      assert.ok(Notification.get.calledWith({tag: 0}));
    });

    test('the display is populated with the message contents', function() {
      closeButton = document.getElementById('close');
      title = document.getElementById('title');
      screen = document.getElementById('si-sl-screen');
      container = screen.querySelector('.container');
      text = container.querySelector('p');
      link = container.querySelector('a');

      var retrieveSpy = this.sinon.spy(MockMessageDB, 'retrieve');

      MockNavigatormozSetMessageHandler.mTrigger('wappush-received', message);
      MockNavigatormozApps.mTriggerLastRequestSuccess();
      WapPushManager.displayWapPushMessage(0);
      retrieveSpy.yield(ParsedMessage.from(message, 0));
      assert.equal(title.textContent, message.sender);
      assert.equal(text.textContent, 'check this out');
      assert.equal(link.textContent, 'http://www.mozilla.org');
      assert.equal(link.dataset.url, 'http://www.mozilla.org');
      assert.equal(link.href, 'http://www.mozilla.org/');
    });

    test('Notification is closed', function() {
      var closeSpy = this.sinon.spy(MockNotification.prototype, 'close');

      MockNavigatormozSetMessageHandler.mTrigger('wappush-received', message);
      MockNavigatormozApps.mTriggerLastRequestSuccess();
      WapPushManager.displayWapPushMessage(0);
      sinon.assert.calledOnce(closeSpy);
    });
  });

  suite('receiving and displaying a CP message', function() {
    var message;

     // UI elements
    var screen;
    var closeButton;
    var title;
    var acceptButton;
    var pin;

    suiteSetup(function(done) {
      MockNavigatormozSetMessageHandler.mSetup();
      MockNavigatorSettings.createLock().set(
        { 'wap.push.enabled': 'true' }
      );
      WapPushManager.init(done);

      message = {
        sender: '22997',
        contentType: 'text/vnd.wap.connectivity-xml',
        content: '<wap-provisioningdoc></wap-provisioningdoc>',
        authInfo: {
           pass: true,
           checked: true,
           sec: 'NETWPIN',
           mac: 'FAKEMAC',
           data: 'FAKEDATA'
        }
      };
    });

    setup(function(done) {
      MockNavigatormozSetMessageHandler.mSetup();
      WapPushManager.init(done);
    });

    teardown(function() {
      MockNavigatormozApps.mTeardown();
      MockNavigatorSettings.mTeardown();
      MockNavigatormozSetMessageHandler.mTeardown();
    });

    test('the notification is sent', function() {
      var notificationSpy = this.sinon.spy(window, 'Notification');
      MockNavigatormozSetMessageHandler.mTrigger('wappush-received', message);
      MockNavigatormozApps.mTriggerLastRequestSuccess();
      assert.isTrue(notificationSpy.calledOnce);
    });

    test('Notification.get() called with correct tag', function() {
      MockNavigatormozSetMessageHandler.mTrigger('wappush-received', message);
      MockNavigatormozApps.mTriggerLastRequestSuccess();
      WapPushManager.displayWapPushMessage(0);
      assert.ok(Notification.get.calledWith({tag: 0}));
    });

    test('the display is populated with the message contents', function() {
      closeButton = document.getElementById('close');
      title = document.getElementById('title');
      screen = document.getElementById('cp-screen');
      acceptButton = document.getElementById('accept');
      pin = screen.querySelector('input');

      var retrieveSpy = this.sinon.spy(MockMessageDB, 'retrieve');

      MockNavigatormozSetMessageHandler.mTrigger('wappush-received', message);
      MockNavigatormozApps.mTriggerLastRequestSuccess();
      WapPushManager.displayWapPushMessage(0);
      retrieveSpy.yield(ParsedMessage.from(message, 0));
      assert.equal(title.textContent, message.sender);
      assert.equal(acceptButton.hidden, false);
      assert.equal(pin.type, 'hidden');
    });

    test('Notification is closed', function() {
      var closeSpy = this.sinon.spy(MockNotification.prototype, 'close');

      MockNavigatormozSetMessageHandler.mTrigger('wappush-received', message);
      MockNavigatormozApps.mTriggerLastRequestSuccess();
      WapPushManager.displayWapPushMessage(0);
      sinon.assert.called(closeSpy);
    });
  });

  suite('handling out-of-order reception of messages', function() {
    var messages = {
      oldest: {
        sender: '+31641600986',
        contentType: 'text/vnd.wap.si',
        content: '<si>' +
                 '<indication si-id="gaia-test@mozilla.org" ' +
                 '            created="2013-09-03T10:35:33Z">' +
                 'oldest message' +
                 '</indication>' +
                 '</si>'
      },
      old: {
        sender: '+31641600986',
        contentType: 'text/vnd.wap.si',
        content: '<si>' +
                 '<indication si-id="gaia-test@mozilla.org" ' +
                 '            created="2013-09-03T12:35:33Z">' +
                 'old message' +
                 '</indication>' +
                 '</si>'
      },
      current: {
        sender: '+31641600986',
        contentType: 'text/vnd.wap.si',
        content: '<si>' +
                 '<indication si-id="gaia-test@mozilla.org" ' +
                 '            created="2013-09-03T14:35:33Z">' +
                 'current message' +
                 '</indication>' +
                 '</si>'
      }
    };

    // UI elements
    var screen;
    var container;
    var text;

    setup(function(done) {
      this.sinon.stub(MockMessageDB, 'put');
      this.sinon.stub(MockMessageDB, 'retrieve');

      MockNavigatormozSetMessageHandler.mSetup();
      WapPushManager.init(done);

      screen = document.getElementById('si-sl-screen');
      container = screen.querySelector('.container');
      text = container.querySelector('p');
    });

    teardown(function() {
      MockNavigatormozSetMessageHandler.mTeardown();
      MockNavigatormozApps.mTeardown();
    });

    test('the old message is expired', function() {
      MockNavigatormozSetMessageHandler.mTrigger('wappush-received',
                                                 messages.oldest);
      MockMessageDB.put.yield('new');
      MockNavigatormozApps.mTriggerLastRequestSuccess();
      MockNavigatormozSetMessageHandler.mTrigger('wappush-received',
                                                 messages.current);
      MockMessageDB.put.yield('new');
      MockNavigatormozApps.mTriggerLastRequestSuccess();
      WapPushManager.displayWapPushMessage(0);
      MockMessageDB.retrieve.yield(null);
      assert.equal(text.textContent, 'this-message-has-expired');
    });

    test('an outdated message does not replace a newer one', function() {
      var notificationSpy = this.sinon.spy(window, 'Notification');
      MockNavigatormozSetMessageHandler.mTrigger('wappush-received',
                                                 messages.old);
      MockMessageDB.put.yield('discarded');
      assert.isTrue(notificationSpy.notCalled);
    });

    test('the current message is displayed', function() {
      WapPushManager.displayWapPushMessage(0);
      MockMessageDB.retrieve.yield(ParsedMessage.from(messages.current, 0));
      assert.equal(text.textContent, 'current message');
    });
  });

  suite('handling expired messages', function() {
    var message = {
      sender: '+31641600986',
      contentType: 'text/vnd.wap.si',
      content: '<si>' +
               '<indication si-expires="2013-09-03T10:35:33Z">' +
               'check this out' +
               '</indication>' +
               '</si>'
    };

    setup(function(done) {
      MockNavigatormozSetMessageHandler.mSetup();
      WapPushManager.init(done);
    });

    teardown(function() {
      MockNavigatormozApps.mTeardown();
      MockNavigatormozSetMessageHandler.mTeardown();
    });

    test('the message was not stored in the database', function() {
      var putSpy = this.sinon.spy(MockMessageDB, 'put');
      MockNavigatormozSetMessageHandler.mTrigger('wappush-received', message);
      assert.isTrue(putSpy.notCalled);
    });
  });

  suite('handling actions', function() {
    var messages = {
      none: {
        sender: '+31641600986',
        contentType: 'text/vnd.wap.si',
        content: '<si>' +
                 '<indication si-id="gaia-test@mozilla.org"' +
                 '            action="signal-none">' +
                 'check this out' +
                 '</indication>' +
                 '</si>'
      }
    };

    setup(function(done) {
      MockNavigatormozSetMessageHandler.mSetup();
      WapPushManager.init(done);
    });

    teardown(function() {
      MockNavigatormozApps.mTeardown();
      MockNavigatormozSetMessageHandler.mTeardown();
    });

    test('action=signal-none does not send a notification', function() {
      var getSelfSpy = this.sinon.spy(MockNavigatormozApps, 'getSelf');

      MockNavigatormozSetMessageHandler.mTrigger('wappush-received',
                                                 messages.none);
      assert.isTrue(getSelfSpy.notCalled);
    });
  });

  suite('automatic closing of the application', function() {
    var isDocumentHidden;
    var message = {
      sender: '+31641600986',
      contentType: 'text/vnd.wap.si',
      content: '<si><indication href="http://www.mozilla.org">' +
               'check this out</indication></si>'
    };

    setup(function(done) {
      MockNavigatormozSetMessageHandler.mSetup();
      WapPushManager.init(done);

      this.clock = this.sinon.useFakeTimers();
      this.sinon.spy(window, 'close');

      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: function() {
          return isDocumentHidden;
        }
      });
    });

    teardown(function() {
      delete document.hidden;
      this.clock.restore();
      MockNavigatormozApps.mTeardown();
      MockNavigatormozSetMessageHandler.mTeardown();
    });

    test('the app is closed after displaying a notification', function() {
      isDocumentHidden = true;

      MockNavigatormozSetMessageHandler.mTrigger('wappush-received', message);
      MockNavigatormozApps.mTriggerLastRequestSuccess();
      this.clock.tick(100);
      sinon.assert.calledOnce(window.close);
    });

    test('the app is not closed if it is visible', function() {
      isDocumentHidden = false;

      MockNavigatormozSetMessageHandler.mTrigger('wappush-received', message);
      MockNavigatormozApps.mTriggerLastRequestSuccess();
      this.clock.tick(100);
      sinon.assert.notCalled(window.close);
    });

    test('the app is closed only after processing all messages', function() {
      isDocumentHidden = true;

      MockNavigatormozSetMessageHandler.mTrigger('wappush-received', message);
      MockNavigatormozApps.mTriggerLastRequestSuccess();
      MockNavigatormozSetMessageHandler.mTrigger('wappush-received', message);
      this.clock.tick(100);
      sinon.assert.notCalled(window.close);
      MockNavigatormozApps.mTriggerLastRequestSuccess();
      this.clock.tick(100);
      sinon.assert.calledOnce(window.close);
    });

    test('prevent the app from closing if it becomes visible', function() {
      isDocumentHidden = true;

      MockNavigatormozSetMessageHandler.mTrigger('wappush-received', message);
      MockNavigatormozApps.mTriggerLastRequestSuccess();
      MockNavigatormozSetMessageHandler.mTrigger('wappush-received', message);
      this.clock.tick(100);
      MockNavigatormozApps.mTriggerLastRequestSuccess();
      isDocumentHidden = false;
      WapPushManager.onVisibilityChange();
      this.clock.tick(100);
      sinon.assert.notCalled(window.close);
    });

    test('the app is closed when hidden', function() {
      isDocumentHidden = false;
      WapPushManager.onVisibilityChange();
      this.clock.tick(100);
      isDocumentHidden = true;
      WapPushManager.onVisibilityChange();
      this.clock.tick(100);
      sinon.assert.calledOnce(window.close);
    });
  });
});
