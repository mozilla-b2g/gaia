'use strict';

requireApp(
  'sms/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js'
);
requireApp('sms/shared/test/unit/mocks/mock_navigator_wake_lock.js');
requireApp('sms/shared/test/unit/mocks/mock_notification_helper.js');
requireApp('sms/shared/test/unit/mocks/mock_navigator_moz_apps.js');
requireApp('sms/test/unit/mock_attachment.js');
requireApp('sms/test/unit/mock_compose.js');
requireApp('sms/test/unit/mock_messages.js');
requireApp('sms/test/unit/mock_black_list.js');
requireApp('sms/test/unit/mock_threads.js');
requireApp('sms/test/unit/mock_contacts.js');

requireApp('sms/js/utils.js');
requireApp('sms/test/unit/mock_utils.js');

requireApp('sms/js/activity_handler.js');

var mocksHelperForActivityHandler = new MocksHelper([
  'Attachment',
  'Compose',
  'BlackList',
  'Threads',
  'Contacts',
  'Utils',
  'NotificationHelper'
]).init();

suite('ActivityHandler', function() {
  var mocksHelper = mocksHelperForActivityHandler;

  mocksHelper.attachTestHelpers();

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

});
