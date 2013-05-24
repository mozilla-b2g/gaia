'use strict';

mocha.globals(['alert']);

requireApp(
  'sms/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js'
);
requireApp('sms/shared/test/unit/mocks/mock_navigator_wake_lock.js');
requireApp('sms/shared/test/unit/mocks/mock_notification_helper.js');
requireApp('sms/shared/test/unit/mocks/mock_navigator_moz_apps.js');

requireApp('sms/test/unit/mock_l10n.js');
requireApp('sms/test/unit/mock_alert.js');
requireApp('sms/test/unit/mock_attachment.js');
requireApp('sms/test/unit/mock_black_list.js');
requireApp('sms/test/unit/mock_compose.js');
requireApp('sms/test/unit/mock_contacts.js');
requireApp('sms/test/unit/mock_messages.js');
requireApp('sms/test/unit/mock_message_manager.js');
requireApp('sms/test/unit/mock_threads.js');

requireApp('sms/js/utils.js');
requireApp('sms/test/unit/mock_utils.js');

requireApp('sms/js/activity_handler.js');

var mocksHelperForActivityHandler = new MocksHelper([
  'Attachment',
  'BlackList',
  'Compose',
  'Contacts',
  'MessageManager',
  'NotificationHelper',
  'Threads',
  'Utils',
  'alert'
]).init();

suite('ActivityHandler', function() {
  mocksHelperForActivityHandler.attachTestHelpers();

  var realSetMessageHandler;
  var realWakeLock;
  var realMozApps;

  suiteSetup(function() {
    realSetMessageHandler = navigator.mozSetMessageHandler;
    navigator.mozSetMessageHandler = MockNavigatormozSetMessageHandler;

    realWakeLock = navigator.requestWakeLock;
    navigator.requestWakeLock = MockNavigatorWakeLock.requestWakeLock;

    realMozApps = navigator.mozApps;
    navigator.mozApps = MockNavigatormozApps;

    // in case a previous state does not properly clean its stuff
    window.location.hash = '';
  });

  suiteTeardown(function() {
    navigator.mozSetMessageHandler = realSetMessageHandler;
    navigator.requestWakeLock = realWakeLock;
    navigator.mozApps = realMozApps;
  });

  setup(function() {
    MockNavigatormozSetMessageHandler.mSetup();
    ActivityHandler.init();
  });

  teardown(function() {
    MockNavigatormozSetMessageHandler.mTeardown();
    MockNavigatormozApps.mTeardown();
    MockNavigatorWakeLock.mTeardown();
  });

  suite('init', function() {
    test('the message handlers are bound', function() {
      var handlers = MockNavigatormozSetMessageHandler.mMessageHandlers;
      assert.ok(handlers['activity']);
      assert.ok(handlers['sms-received']);
      assert.ok(handlers['notification']);
    });
  });

  suite('"share" activity', function() {
    var shareActivity;

    setup(function() {
      this.prevHash = window.location.hash;

      shareActivity = {
        source: {
          name: 'share',
          data: {
            blobs: [new Blob(), new Blob()],
            filenames: ['testBlob1', 'testBlob2']
          }
        }
      };
      this.prevAppend = Compose.append;
    });

    teardown(function() {
      window.location.hash = this.prevHash;
      Compose.append = this.prevAppend;
    });

    test('modifies the URL "hash" when necessary', function() {
      window.location.hash = '#wrong-location';
      MockNavigatormozSetMessageHandler.mTrigger('activity', shareActivity);
      assert.equal(window.location.hash, '#new');
    });

    test('Appends an attachment to the Compose field for each media file',
      function(done) {
      Compose.append = sinon.spy(function(attachment) {

        assert.instanceOf(attachment, Attachment);
        assert.ok(Compose.append.callCount < 3);

        if (Compose.append.callCount === 2) {
          done();
        }
      });

      MockNavigatormozSetMessageHandler.mTrigger('activity', shareActivity);
    });
  });

  suite('sms received', function() {
    var message;

    setup(function() {
      message = MockMessages.sms();
      MockNavigatormozSetMessageHandler.mTrigger('sms-received', message);
    });

    test('request the cpu wake lock', function() {
      var wakeLock = MockNavigatorWakeLock.mLastWakeLock;
      assert.ok(wakeLock);
      assert.equal(wakeLock.topic, 'cpu');
    });

    suite('after getSelf', function() {
      setup(function() {
        MockNavigatormozApps.mTriggerLastRequestSuccess();
      });

      test('a notification is sent', function() {
        assert.equal(MockNotificationHelper.mBody, message.body);

        var expectedicon = 'sms?threadId=' + message.threadId + '&number=' +
          message.sender + '&id=' + message.id;

        assert.equal(MockNotificationHelper.mIcon, expectedicon);
      });

      test('the lock is released', function() {
        assert.ok(MockNavigatorWakeLock.mLastWakeLock.released);
      });

      suite('click on the notification', function() {
        setup(function() {
          assert.ok(MockNotificationHelper.mClickCB);
          this.sinon.stub(ActivityHandler, 'handleMessageNotification');
          MockNotificationHelper.mClickCB();
        });

        test('launches the app', function() {
          assert.ok(MockNavigatormozApps.mAppWasLaunched);
        });
      });
    });
  });

  suite('user clicked the notification', function() {
    var messageId = 1;
    var threadId = 1;
    var title = 'title';
    var body = 'body';

    setup(function() {
      this.sinon.stub(ActivityHandler, 'handleMessageNotification');
    });

    suite('normal message', function() {
      setup(function() {
        var message = {
          title: title,
          body: body,
          imageURL: 'url?id=' + messageId + '&threadId=' + threadId,
          clicked: true
        };

        MockNavigatormozSetMessageHandler.mTrigger('notification', message);
        MockNavigatormozApps.mTriggerLastRequestSuccess();
      });

      test('handleMessageNotification has been called', function() {
        var spied = ActivityHandler.handleMessageNotification;
        var firstCall = spied.args[0];
        assert.ok(firstCall);
        var arg = firstCall[0];
        assert.equal(arg.id, messageId);
        assert.equal(arg.threadId, threadId);
      });

      test('launches the app', function() {
        assert.ok(MockNavigatormozApps.mAppWasLaunched);
      });
    });

    suite('class-0 message', function() {
      setup(function() {
      var notification = {
        title: title,
        body: body,
        imageURL: 'url?id=' + messageId + '&threadId=' + threadId +
          '&type=class0',
        clicked: true
      };

      MockNavigatormozSetMessageHandler.mTrigger('notification', notification);
      MockNavigatormozApps.mTriggerLastRequestSuccess();
      });

      test('an alert is displayed', function() {
        assert.equal(Mockalert.mLastMessage, title + '\n' + body);
      });

      test('handleMessageNotification is not called', function() {
        var spied = ActivityHandler.handleMessageNotification;
        assert.isFalse(spied.called);
      });
    });
  });

  suite('"new" activity', function() {
    var realMozL10n;

    suiteSetup(function() {
      realMozL10n = navigator.mozL10n;
      navigator.mozL10n = MockL10n;
    });
    suiteTeardown(function() {
      navigator.mozL10n = realMozL10n;
    });
    test('new message to unknown contact', function(done) {
      window.onhashchange = function() {
        assert.equal(window.location.hash, '#new');
        assert.equal(MessageManager.activity.number, '999');
        assert.equal(MessageManager.activity.body, 'foo');
        window.onhashchange = null;
        done();
      };

      ActivityHandler.toView({
        body: 'foo',
        number: '999'
      });
    });
  });
});
