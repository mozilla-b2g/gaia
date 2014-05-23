/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global loadBodyHTML, MockL10n, MockMessageDB, MockNavigatormozApps,
          MockNavigatorMozIccManager, MockNavigatormozSetMessageHandler,
          MockNavigatorSettings, MockNotification, MocksHelper, Notification,
          ParsedMessage, WapPushManager */

'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_apps.js');
require('/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js');
require('/shared/test/unit/mocks/mock_notification.js');
require('/shared/test/unit/mocks/mock_notification_helper.js');
require('/shared/test/unit/mocks/mock_navigator_moz_icc_manager.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');

require('/js/cp_screen_helper.js');
require('/js/parsed_message.js');
require('/js/provisioning.js');
require('/js/si_sl_screen_helper.js');
require('/js/utils.js');
require('/js/wappush.js');

require('/test/unit/mock_l10n.js');
require('/test/unit/mock_link_action_handler.js');
require('/test/unit/mock_messagedb.js');
require('/test/unit/mock_whitelist.js');

var mocksHelperWapPush = new MocksHelper([
  'LinkActionHandler',
  'MessageDB',
  'NotificationHelper',
  'Notification',
  'WhiteList'
]).init();

suite('WAP Push', function() {
  var realMozApps;
  var realMozIccManager;
  var realMozSettings;
  var realSetMessageHandler;
  var realMozL10n;
  var isDocumentHidden = false;

  mocksHelperWapPush.attachTestHelpers();

  suiteSetup(function() {
    realMozApps = navigator.mozApps;
    navigator.mozApps = MockNavigatormozApps;

    realMozIccManager = navigator.mozIccManager;
    navigator.mozIccManager = MockNavigatorMozIccManager;

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

  setup(function(done) {
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

    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: function() {
        return isDocumentHidden;
      }
    });

    MockNavigatorMozIccManager.addIcc(0, {});
    MockNavigatormozSetMessageHandler.mSetup();
    WapPushManager.init().then(done, done);
    MockNavigatormozApps.mTriggerLastRequestSuccess();
  });

  teardown(function() {
    delete document.hidden;
    MockNavigatormozSetMessageHandler.mTeardown();
    MockNavigatorMozIccManager.mTeardown();
    MockNavigatormozApps.mTeardown();
    MockNavigatorSettings.mTeardown();
    mocksHelperWapPush.teardown();
  });

  suite('init', function() {
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
      content: '',
      serviceId: 0
    };

    test('unsupported messages are discarded', function() {
      this.sinon.spy(MockMessageDB, 'put');
      MockNavigatormozSetMessageHandler.mTrigger('wappush-received', message);
      sinon.assert.notCalled(MockMessageDB.put);
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
               'check this out</indication></si>',
      serviceId: 0
    };

    test('the notification is sent and populated correctly', function() {
      this.sinon.spy(window, 'Notification');
      MockNavigatormozSetMessageHandler.mTrigger('wappush-received', message);
      sinon.assert.calledOnce(Notification);
      sinon.assert.calledWithMatch(Notification, message.sender, {
        body: 'check this out http://www.mozilla.org'
      });
    });

    test('Notification.get() called with correct tag', function() {
      MockNavigatormozSetMessageHandler.mTrigger('wappush-received', message);
      WapPushManager.displayWapPushMessage(0);
      sinon.assert.calledWith(Notification.get, {tag: 0});
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
      WapPushManager.displayWapPushMessage(0);
      retrieveSpy.yield(ParsedMessage.from(message, 0));
      assert.equal(title.textContent, message.sender);
      assert.equal(text.textContent, 'check this out');
      assert.equal(link.textContent, 'http://www.mozilla.org');
      assert.equal(link.dataset.url, 'http://www.mozilla.org');
      assert.equal(link.href, 'http://www.mozilla.org/');
    });

    test('Notification is closed', function() {
      this.sinon.spy(MockNotification.prototype, 'close');

      MockNavigatormozSetMessageHandler.mTrigger('wappush-received', message);
      WapPushManager.displayWapPushMessage(0);
      sinon.assert.calledOnce(MockNotification.prototype.close);
    });

    suite('DSDS scenarios', function() {
      setup(function() {
        MockNavigatorMozIccManager.addIcc(1, {});
      });

      test('the notification is populated correctly for SIM1', function() {
        this.sinon.spy(window, 'Notification');
        MockNavigatormozSetMessageHandler.mTrigger('wappush-received', message);
        sinon.assert.calledOnce(Notification);
        sinon.assert.calledWithMatch(Notification, /1/, {
          body: 'check this out http://www.mozilla.org'
        });
      });

      test('the notification is populated correctly for SIM2', function() {
        this.sinon.spy(window, 'Notification');
        message.serviceId = 1;
        MockNavigatormozSetMessageHandler.mTrigger('wappush-received', message);
        sinon.assert.calledOnce(Notification);
        sinon.assert.calledWithMatch(Notification, /2/, {
          body: 'check this out http://www.mozilla.org'
        });
      });
    });
  });

  suite('receiving and displaying a CP message', function() {
    var messages = {
      netwpin: {
        sender: '22997',
        contentType: 'text/vnd.wap.connectivity-xml',
        content: '<wap-provisioningdoc></wap-provisioningdoc>',
        authInfo: {
           pass: true,
           checked: true,
           sec: 'NETWPIN',
           mac: 'FAKEMAC',
           data: 'FAKEDATA'
        },
        serviceId: 0
      },
      userpin: {
        sender: '22997',
        contentType: 'text/vnd.wap.connectivity-xml',
        content: '<wap-provisioningdoc></wap-provisioningdoc>',
        authInfo: {
           pass: true,
           checked: true,
           sec: 'USERPIN',
           mac: 'FAKEMAC',
           data: 'FAKEDATA'
        },
        serviceId: 0
      }
    };

     // UI elements
    var screen;
    var closeButton;
    var title;
    var acceptButton;
    var pin;

    test('the notification is sent', function() {
      this.sinon.spy(window, 'Notification');
      MockNavigatormozSetMessageHandler.mTrigger(
        'wappush-received',
        messages.netwpin
      );
      sinon.assert.calledOnce(Notification);
    });

    test('Notification.get() called with correct tag', function() {
      MockNavigatormozSetMessageHandler.mTrigger(
        'wappush-received',
        messages.netwpin
      );
      WapPushManager.displayWapPushMessage(0);
      sinon.assert.calledWith(Notification.get, {tag: 0});
    });

    test('the display is populated with the NETWPIN message contents',
      function() {
        closeButton = document.getElementById('close');
        title = document.getElementById('title');
        screen = document.getElementById('cp-screen');
        acceptButton = document.getElementById('accept');
        pin = screen.querySelector('input');

        var retrieveSpy = this.sinon.spy(MockMessageDB, 'retrieve');

        MockNavigatormozSetMessageHandler.mTrigger(
          'wappush-received',
          messages.netwpin
        );
        WapPushManager.displayWapPushMessage(0);
        retrieveSpy.yield(ParsedMessage.from(messages.netwpin, 0));
        assert.equal(title.textContent, messages.netwpin.sender);
        assert.equal(acceptButton.hidden, false);
        assert.equal(pin.type, 'hidden');
    });

    test('the display is populated with the USERPIN message contents',
      function() {
        closeButton = document.getElementById('close');
        title = document.getElementById('title');
        screen = document.getElementById('cp-screen');
        acceptButton = document.getElementById('accept');
        pin = screen.querySelector('input');

        var retrieveSpy = this.sinon.spy(MockMessageDB, 'retrieve');

        MockNavigatormozSetMessageHandler.mTrigger(
          'wappush-received',
          messages.netwpin
        );
        WapPushManager.displayWapPushMessage(0);
        retrieveSpy.yield(ParsedMessage.from(messages.userpin, 0));
        assert.equal(title.textContent, messages.netwpin.sender);
        assert.equal(acceptButton.hidden, false);
        assert.equal(pin.type, 'text');
    });

    test('Notification is closed', function() {
      var closeSpy = this.sinon.spy(MockNotification.prototype, 'close');

      MockNavigatormozSetMessageHandler.mTrigger(
        'wappush-received',
        messages.netwpin
      );
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
                 '</si>',
        serviceId: 0
      },
      old: {
        sender: '+31641600986',
        contentType: 'text/vnd.wap.si',
        content: '<si>' +
                 '<indication si-id="gaia-test@mozilla.org" ' +
                 '            created="2013-09-03T12:35:33Z">' +
                 'old message' +
                 '</indication>' +
                 '</si>',
        serviceId: 0
      },
      current: {
        sender: '+31641600986',
        contentType: 'text/vnd.wap.si',
        content: '<si>' +
                 '<indication si-id="gaia-test@mozilla.org" ' +
                 '            created="2013-09-03T14:35:33Z">' +
                 'current message' +
                 '</indication>' +
                 '</si>',
        serviceId: 0
      }
    };

    // UI elements
    var screen;
    var container;
    var text;

    setup(function() {
      this.sinon.stub(MockMessageDB, 'put');
      this.sinon.stub(MockMessageDB, 'retrieve');

      screen = document.getElementById('si-sl-screen');
      container = screen.querySelector('.container');
      text = container.querySelector('p');
    });

    test('the old message is expired', function() {
      MockNavigatormozSetMessageHandler.mTrigger('wappush-received',
                                                 messages.oldest);
      MockMessageDB.put.yield('new');
      MockNavigatormozSetMessageHandler.mTrigger('wappush-received',
                                                 messages.current);
      MockMessageDB.put.yield('new');
      WapPushManager.displayWapPushMessage(0);
      MockMessageDB.retrieve.yield(null);
      assert.equal(text.textContent, 'this-message-has-expired');
    });

    test('an outdated message does not replace a newer one', function() {
      this.sinon.spy(window, 'Notification');
      MockNavigatormozSetMessageHandler.mTrigger('wappush-received',
                                                 messages.old);
      MockMessageDB.put.yield('discarded');
      sinon.assert.notCalled(Notification);
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
               '</si>',
      serviceId: 0
    };

    test('the message was not stored in the database', function() {
      this.sinon.spy(MockMessageDB, 'put');
      MockNavigatormozSetMessageHandler.mTrigger('wappush-received', message);
      sinon.assert.notCalled(MockMessageDB.put);
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
                 '</si>',
        serviceId: 0
      }
    };

    /* XXX: Workaround for bug 981521. We shouldn't send notifications for
     * signal-none messages but we do until we'll have another way for the user
     * to find & display them. */
    test('action=signal-none sends a notification', function() {
      this.sinon.spy(window, 'Notification');
      MockNavigatormozSetMessageHandler.mTrigger('wappush-received',
                                                 messages.none);
      MockNavigatormozApps.mTriggerLastRequestSuccess();
      sinon.assert.calledOnce(Notification);
      sinon.assert.calledWithMatch(Notification, messages.none.sender,
        { body: 'check this out' });
    });
  });

  suite('automatic closing of the application', function() {
    var message = {
      sender: '+31641600986',
      contentType: 'text/vnd.wap.si',
      content: '<si><indication href="http://www.mozilla.org">' +
               'check this out</indication></si>',
      serviceId: 0
    };

    setup(function() {
      this.clock = this.sinon.useFakeTimers();
      this.sinon.spy(window, 'close');
    });

    teardown(function() {
      this.clock.restore();
    });

    test('the app is closed after displaying a notification', function() {
      isDocumentHidden = true;

      MockNavigatormozSetMessageHandler.mTrigger('wappush-received', message);
      this.clock.tick(100);
      sinon.assert.calledOnce(window.close);
    });

    test('the app is not closed if it is visible', function() {
      isDocumentHidden = false;

      MockNavigatormozSetMessageHandler.mTrigger('wappush-received', message);
      this.clock.tick(100);
      sinon.assert.notCalled(window.close);
    });

    test('the app is closed only after processing all messages', function() {
      isDocumentHidden = true;

      MockNavigatormozSetMessageHandler.mTrigger('wappush-received', message);
      sinon.assert.notCalled(window.close);
      MockNavigatormozSetMessageHandler.mTrigger('wappush-received', message);
      sinon.assert.notCalled(window.close);
      this.clock.tick(100);
      sinon.assert.calledOnce(window.close);
    });

    test('prevent the app from closing if it becomes visible', function() {
      isDocumentHidden = true;

      MockNavigatormozSetMessageHandler.mTrigger('wappush-received', message);
      sinon.assert.notCalled(window.close);
      MockNavigatormozSetMessageHandler.mTrigger('wappush-received', message);
      sinon.assert.notCalled(window.close);
      this.clock.tick(50);
      isDocumentHidden = false;
      WapPushManager.onVisibilityChange();
      this.clock.tick(50);
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
