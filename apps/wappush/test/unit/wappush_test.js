'use strict';

requireApp('wappush/shared/test/unit/mocks/mock_navigator_moz_apps.js');
requireApp(
  'wappush/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js'
);
requireApp('wappush/shared/test/unit/mocks/mock_notification_helper.js');
requireApp('wappush/shared/test/unit/mocks/mock_navigator_moz_settings.js');

requireApp('wappush/js/parsed_message.js');
requireApp('wappush/js/utils.js');

requireApp('wappush/test/unit/mock_l10n.js');
requireApp('wappush/test/unit/mock_link_action_handler.js');
requireApp('wappush/test/unit/mock_messagedb.js');
requireApp('wappush/test/unit/mock_whitelist.js');

/* The WapPushManager binds stuff when evaluated so we load it after the mocks
 * and we don't want it to show up as a leak. */
if (!this.WapPushManager) {
  this.WapPushManager = null;
}

var mocksHelperWapPush = new MocksHelper([
  'LinkActionHandler',
  'MessageDB',
  'NotificationHelper',
  'WhiteList'
]).init();

suite('WAP Push', function() {
  var realMozApps;
  var realMozSettings;
  var realSetMessageHandler;
  var realMozL10n;

  // UI elements
  var closeButton;
  var title;
  var container;
  var text;
  var link;

  mocksHelperWapPush.attachTestHelpers();

  suiteSetup(function(done) {
    realMozApps = navigator.mozApps;
    navigator.mozApps = MockNavigatormozApps;

    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    realSetMessageHandler = navigator.mozSetMessageHandler;
    navigator.mozSetMessageHandler = MockNavigatormozSetMessageHandler;

    /* We load the body before the JS sources to prevent the load event from
     * being triggered, this in turn prevents the WapPushManager from starting
     * up automatically. */
    loadBodyHTML('/index.html');
    requireApp('wappush/js/wappush.js', done);

    // Retrieve the UI elements
    closeButton = document.getElementById('close');
    title = document.getElementById('title');
    container = document.getElementById('wappush-container');
    text = document.getElementById('wappush-container').querySelector('p');
    link = document.getElementById('wappush-container').querySelector('a');
  });

  suiteTeardown(function() {
    navigator.mozApps = realMozApps;
    navigator.mozL10n = realMozL10n;
    navigator.mozSettings = realMozSettings;
    navigator.mozSetMessageHandler = realSetMessageHandler;
  });

  setup(function() {
    mocksHelperWapPush.setup();
  });

  teardown(function() {
    MockNavigatormozApps.mTeardown();
    mocksHelperWapPush.teardown();
  });

  suite('init', function() {
    suiteSetup(function(done) {
      MockNavigatormozSetMessageHandler.mSetup();
      MockNavigatorSettings.createLock().set(
        { 'wap.push.enabled': 'true' }
      );
      WapPushManager.init(done);
    });

    suiteTeardown(function() {
      MockNavigatormozSetMessageHandler.mTeardown();
      MockNavigatorSettings.mTeardown();
    });

    test('the message handlers are bound', function() {
      var handlers = MockNavigatormozSetMessageHandler.mMessageHandlers;
      assert.ok(handlers['notification']);
      assert.ok(handlers['wappush-received']);
    });

    test('the UI elements have been retrieved correctly', function() {
      WapPushManager._closeButton === closeButton;
      WapPushManager._title === title;
      WapPushManager._container === container;
      WapPushManager._text === text;
      WapPushManager._link === link;
    });
  });

  suite('unsupported message', function() {
    var message;

    suiteSetup(function(done) {
      MockNavigatorSettings.createLock().set(
        { 'wap.push.enabled': 'true' }
      );
      WapPushManager.init(done);

      message = {
        unsupported: {
          sender: '+31641600986',
          contentType: 'text/foobar',
          content: ''
        }
      };
    });

    suiteTeardown(function() {
      MockNavigatorSettings.mTeardown();
      MockNavigatormozSetMessageHandler.mTeardown();
    });

    test('unsupported messages are discarded', function() {
      var putSpy = this.sinon.spy(MockMessageDB, 'put');
      MockNavigatormozSetMessageHandler.mTrigger('wappush-received', message);
      assert.isTrue(putSpy.notCalled);
    });
  });

  suite('receiving and displaying a message', function() {
    var message;

    suiteSetup(function(done) {
      MockNavigatormozSetMessageHandler.mSetup();
      MockNavigatorSettings.createLock().set(
        { 'wap.push.enabled': 'true' }
      );
      WapPushManager.init(done);

      message = {
        sender: '+31641600986',
        contentType: 'text/vnd.wap.si',
        content: '<si><indication href="http://www.mozilla.org">' +
                 'check this out</indication></si>'
      };
    });

    suiteTeardown(function() {
      MockNavigatormozApps.mTeardown();
      MockNavigatorSettings.mTeardown();
      MockNavigatormozSetMessageHandler.mTeardown();
    });

    setup(function() {
      MockNavigatormozSetMessageHandler.mTrigger('wappush-received', message);
    });

    test('the notification is sent', function() {
      var sendSpy = this.sinon.spy(MockNotificationHelper, 'send');
      MockNavigatormozApps.mTriggerLastRequestSuccess();
      assert.isTrue(sendSpy.calledOnce);
    });

    test('the display is populated with the message contents', function() {
      var retrieveSpy = this.sinon.spy(MockMessageDB, 'retrieve');
      MockNavigatormozApps.mTriggerLastRequestSuccess();
      WapPushManager.displayWapPushMessage(0);
      retrieveSpy.yield(ParsedMessage.from(message, 0));
      assert.equal(title.textContent, message.sender);
      assert.equal(text.textContent, 'check this out');
      assert.equal(link.textContent, 'http://www.mozilla.org');
      assert.equal(link.dataset.url, 'http://www.mozilla.org');
      assert.equal(link.href, 'http://www.mozilla.org/');
    });
  });

  suite('handling out-of-order reception of messages', function() {
    var messages;

    suiteSetup(function() {
      messages = {
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
    });

    setup(function(done) {
      MockNavigatorSettings.createLock().set(
        { 'wap.push.enabled': 'true' }
      );

      this.sinon.stub(MockMessageDB, 'put');
      this.sinon.stub(MockMessageDB, 'retrieve');

      MockNavigatormozSetMessageHandler.mSetup();
      WapPushManager.init(done);
    });

    teardown(function() {
      MockNavigatormozSetMessageHandler.mTeardown();
      MockNavigatormozApps.mTeardown();
      MockNavigatorSettings.mTeardown();
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
      var sendSpy = this.sinon.spy(MockNotificationHelper, 'send');
      MockNavigatormozSetMessageHandler.mTrigger('wappush-received',
                                                 messages.old);
      MockMessageDB.put.yield('discarded');
      assert.isTrue(sendSpy.notCalled);
    });

    test('the current message is displayed', function() {
      WapPushManager.displayWapPushMessage(0);
      MockMessageDB.retrieve.yield(ParsedMessage.from(messages.current, 0));
      assert.equal(text.textContent, 'current message');
    });
  });
});
