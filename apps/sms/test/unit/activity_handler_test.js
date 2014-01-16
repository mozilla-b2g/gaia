/*global Notify, Compose, mocha, MocksHelper, ActivityHandler, Contacts,
         MessageManager, Attachment, ThreadUI */
/*global MockNavigatormozSetMessageHandler, MockNavigatormozApps,
         MockNavigatorWakeLock, MockOptionMenu, Mockalert,
         MockMessages, MockNavigatorSettings, MockL10n,
         MockNavigatormozMobileMessage */

'use strict';

mocha.globals(['alert', 'confirm', 'Notify']);

requireApp(
  'sms/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js'
);
requireApp('sms/shared/test/unit/mocks/mock_navigator_wake_lock.js');
requireApp('sms/shared/test/unit/mocks/mock_notification.js');
requireApp('sms/shared/test/unit/mocks/mock_notification_helper.js');
requireApp('sms/shared/test/unit/mocks/mock_navigator_moz_apps.js');
requireApp('sms/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('sms/shared/test/unit/mocks/mock_settings_url.js');

requireApp('sms/test/unit/mock_l10n.js');
requireApp('sms/test/unit/mock_alert.js');
requireApp('sms/test/unit/mock_attachment.js');
requireApp('sms/test/unit/mock_black_list.js');
requireApp('sms/test/unit/mock_compose.js');
requireApp('sms/test/unit/mock_contacts.js');
requireApp('sms/test/unit/mock_messages.js');
requireApp('sms/test/unit/mock_message_manager.js');
requireApp('sms/test/unit/mock_threads.js');
requireApp('sms/test/unit/mock_thread_ui.js');
requireApp('sms/test/unit/mock_action_menu.js');

requireApp('sms/js/utils.js');
requireApp('sms/test/unit/mock_utils.js');
requireApp('sms/test/unit/mock_navigatormoz_sms.js');

requireApp('sms/js/activity_handler.js');

var mocksHelperForActivityHandler = new MocksHelper([
  'Attachment',
  'BlackList',
  'Compose',
  'Contacts',
  'MessageManager',
  'Notification',
  'NotificationHelper',
  'OptionMenu',
  'SettingsURL',
  'Threads',
  'ThreadUI',
  'Utils',
  'alert'
]).init();

suite('ActivityHandler', function() {
  mocksHelperForActivityHandler.attachTestHelpers();

  var realSetMessageHandler;
  var realWakeLock;
  var realMozApps;
  var realMozL10n;

  suiteSetup(function() {
    realSetMessageHandler = navigator.mozSetMessageHandler;
    navigator.mozSetMessageHandler = MockNavigatormozSetMessageHandler;

    realWakeLock = navigator.requestWakeLock;
    navigator.requestWakeLock = MockNavigatorWakeLock.requestWakeLock;

    realMozApps = navigator.mozApps;
    navigator.mozApps = MockNavigatormozApps;

    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    // in case a previous state does not properly clean its stuff
    window.location.hash = '';
  });

  suiteTeardown(function() {
    navigator.mozSetMessageHandler = realSetMessageHandler;
    navigator.requestWakeLock = realWakeLock;
    navigator.mozApps = realMozApps;
    navigator.mozL10n = realMozL10n;
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
      /*jshint sub: true */
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
      this.sinon.stub(Compose, 'append', function(attachment) {

        assert.instanceOf(attachment, Attachment);
        assert.ok(Compose.append.callCount < 3);

        if (Compose.append.callCount === 2) {
          done();
        }
      });

      MockNavigatormozSetMessageHandler.mTrigger('activity', shareActivity);
    });

    test('share shouldn\'t change the ThreadUI back button', function() {
      this.sinon.stub(ThreadUI, 'enableActivityRequestMode');
      MockNavigatormozSetMessageHandler.mTrigger('activity', shareActivity);
      assert.isFalse(ThreadUI.enableActivityRequestMode.called);
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

    suite('contact retrieved (after getSelf)', function() {
      var contactName = '<&>';
      var sendSpy;
      setup(function() {
        sendSpy = this.sinon.spy(window, 'Notification');
        this.sinon.stub(Contacts, 'findByPhoneNumber')
          .callsArgWith(1, [{name: [contactName]}]);
        MockNavigatormozApps.mTriggerLastRequestSuccess();
      });

      test('passes contact name in plain text', function() {
        sinon.assert.called(sendSpy);
        var notification = sendSpy.firstCall.thisValue;
        assert.equal(notification.title, contactName);
      });
    });

    suite('contact without name (after getSelf)', function() {
      var phoneNumber = '+1111111111';
      var oldSender;
      var sendSpy;
      setup(function() {
        sendSpy = this.sinon.spy(window, 'Notification');
        oldSender = message.sender;
        message.sender = phoneNumber;
        this.sinon.stub(Contacts, 'findByPhoneNumber')
          .callsArgWith(1, [{
            name: [''],
            tel: {'value': phoneNumber}
          }]);
        MockNavigatormozApps.mTriggerLastRequestSuccess();
      });

      suiteTeardown(function() {
        message.sender = oldSender;
      });


      test('phone in notification title when contact without name', function() {
        sinon.assert.called(sendSpy);
        var notification = sendSpy.firstCall.thisValue;
        assert.equal(notification.title, phoneNumber);
      });
    });

    suite('after getSelf', function() {
      var sendSpy;
      setup(function() {
        sendSpy = this.sinon.spy(window, 'Notification');
        MockNavigatormozApps.mTriggerLastRequestSuccess();
      });

      test('a notification is sent', function() {
        sinon.assert.called(sendSpy);
        var notification = sendSpy.firstCall.thisValue;
        assert.equal(notification.body, message.body);
        var expectedicon = 'sms?threadId=' + message.threadId + '&number=' +
          message.sender + '&id=' + message.id;
        assert.equal(notification.icon, expectedicon);
      });

      test('the lock is released', function() {
        assert.ok(MockNavigatorWakeLock.mLastWakeLock.released);
      });

      suite('click on the notification', function() {
        setup(function() {
          var notification = sendSpy.firstCall.thisValue;
          assert.ok(notification.mEvents.click);
          this.sinon.stub(ActivityHandler, 'handleMessageNotification');
          notification.mEvents.click();
        });

        test('launches the app', function() {
          assert.ok(MockNavigatormozApps.mAppWasLaunched);
        });
      });
    });

    suite('receive class-0 message', function() {
      var realMozSettings;

      suiteSetup(function(done) {
        realMozSettings = navigator.mozSettings;
        navigator.mozSettings = MockNavigatorSettings;
        requireApp('sms/js/notify.js', done);
      });

      suiteTeardown(function() {
        navigator.mozSettings = realMozSettings;
      });

      setup(function() {
        this.sinon.stub(Notify, 'ringtone');
        this.sinon.stub(Notify, 'vibrate');

        message = MockMessages.sms({ messageClass: 'class-0' });
        MockNavigatormozSetMessageHandler.mTrigger('sms-received', message);
        MockNavigatormozApps.mTriggerLastRequestSuccess();
      });

      test('play ringtone', function() {
        var spied = Notify.ringtone;
        assert.ok(spied.called);
        spied = Notify.vibrate;
        assert.ok(spied.called);
      });

      test('vibrate', function() {
        var spied = Notify.vibrate;
        assert.ok(spied.called);
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
          tag: 'threadId:' + threadId,
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
        tag: 'threadId:' + threadId,
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
    // Mockup activity
    var newActivity = {
      source: {
        name: 'new',
        data: {
          number: '123',
          body: 'foo'
        }
      }
    };

    var newActivity_empty = {
      source: {
        name: 'new',
        data: {
          number: '123'
        }
      }
    };

    setup(function() {
      // find no contact in here
      this.sinon.stub(Contacts, 'findByPhoneNumber').callsArgWith(1, []);
    });

    teardown(function() {
      MessageManager.activity = null;
    });

    suiteSetup(function() {
      window.location.hash = '#new';
    });

    test('Activity lock should be released properly', function() {
      // Review the status after handling the activity
      this.sinon.stub(MessageManager, 'handleActivity', function(activity) {
        assert.equal(activity.number, '123');
        assert.equal(activity.body, 'foo');
        //Is the lock released for a new request?
        assert.isFalse(ActivityHandler.isLocked);
      });

      MockNavigatormozSetMessageHandler.mTrigger('activity', newActivity);
    });

    test('new message with empty msg', function() {
      // No message in the input field.
      Compose.mEmpty = true;
      this.sinon.stub(MockOptionMenu.prototype, 'show', function() {
        assert.ok(false, 'confirmation dialog should not show');
      });

      // Call the activity. As we are in 'new' there is no hashchange.
      MockNavigatormozSetMessageHandler.mTrigger('activity', newActivity);
    });

    test('new message with no body, with empty msg', function() {
      // No message in the input field.
      Compose.mEmpty = true;
      this.sinon.stub(MockOptionMenu.prototype, 'show', function() {
        assert.ok(false, 'confirmation dialog should not show');
      });

      // Call the activity. As we are in 'new' there is no hashchange.
      MockNavigatormozSetMessageHandler.mTrigger('activity', newActivity_empty);
    });

    test('new message with user input msg, discard it', function() {
      // Review the status after handling the activity
      this.sinon.stub(MessageManager, 'handleActivity', function(activity) {
        assert.equal(activity.number, '123');
        assert.equal(activity.body, 'foo');
        //Is the lock released for a new request?
        assert.isFalse(ActivityHandler.isLocked);

      });
      // User typed message in the input field
      Compose.mEmpty = false;
      this.sinon.stub(MockOptionMenu.prototype, 'show', function() {
        assert.equal(MockOptionMenu.calls.length, 1);
        assert.equal(MockOptionMenu.calls[0].type, 'confirm');

        var items = MockOptionMenu.calls[0].items;
        assert.isNotNull(items);
        assert.equal(items.length, 2);
        // discard is the second button
        assert.isNotNull(items[1]);
        assert.equal(typeof items[1].method, 'function');
        // Check params
        assert.equal(newActivity.source.data.number, items[1].params[0].number);
        assert.equal(newActivity.source.data.body, items[1].params[0].body);
        // Call discard with the params
        items[1].method(items[1].params[0]);
      });

      // Call the activity. As we are in 'new' there is no hashchange.
      MockNavigatormozSetMessageHandler.mTrigger('activity', newActivity);
    });

    test('new message with user input msg, edit it', function() {
      // There is message in the input field.
      Compose.mEmpty = false;
      this.sinon.stub(MockOptionMenu.prototype, 'show', function() {
        assert.equal(MockOptionMenu.calls.length, 1);
        assert.equal(MockOptionMenu.calls[0].type, 'confirm');

        var items = MockOptionMenu.calls[0].items;
        assert.isNotNull(items);
        assert.equal(items.length, 2);
        // edit is the first button
        assert.isNotNull(items[0]);
        assert.equal(typeof items[0].method, 'function');
        // Check if when keeping the previous message the
        // composer keeps the previous status;
        assert.isNotNull(items[0].params);
        // call edit.
        items[0].method();
      });
      MockNavigatormozSetMessageHandler.mTrigger('activity', newActivity);
    });

    test('new message should set the current activity', function() {
      MockNavigatormozSetMessageHandler.mTrigger('activity', newActivity);
      assert.equal(ActivityHandler.currentActivity.new, newActivity);
    });

    test('new message should change the ThreadUI back button', function() {
      this.sinon.stub(ThreadUI, 'enableActivityRequestMode');
      MockNavigatormozSetMessageHandler.mTrigger('activity', newActivity);
      assert.isTrue(ThreadUI.enableActivityRequestMode.called);
    });

  });

  suite('When compose is not empty', function() {

    var message;
    var text;
    var realMozMobileMessage;

    setup(function() {
      text = 'test';
      Compose.append(text);
      message = MockMessages.sms();
      realMozMobileMessage = navigator.mozMobileMessage;
      navigator.mozMobileMessage = MockNavigatormozMobileMessage;
      this.sinon.stub(window, 'confirm');
    });

    teardown(function() {
      navigator.mozMobileMessage = realMozMobileMessage;
    });

    suite('confirm false', function() {

      setup(function() {
        this.sinon.stub(Compose, 'clear');
        this.sinon.stub(ThreadUI, 'cleanFields');
        window.confirm.returns(false);
      });

      test('the text shouldn\'t be cleaned', function() {
        ActivityHandler.handleMessageNotification(message);
        MockNavigatormozMobileMessage.mTriggerSuccessMessageRequest();
        assert.isFalse(Compose.clear.called);
        assert.isFalse(ThreadUI.cleanFields.called);
        assert.isTrue(window.confirm.called);
      });
    });

    suite('confirm true', function() {

      setup(function() {
        window.confirm.returns(true);
        this.sinon.stub(ThreadUI, 'cleanFields');
      });

      test('the text should be cleaned', function() {
        ActivityHandler.handleMessageNotification(message);
        MockNavigatormozMobileMessage.mTriggerSuccessMessageRequest();
        assert.isTrue(ThreadUI.cleanFields.called);
        assert.isTrue(window.confirm.called);
      });
    });
  });
});
