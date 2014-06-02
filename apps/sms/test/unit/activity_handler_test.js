/*global Notify, Compose, MocksHelper, ActivityHandler, Contacts,
         Attachment, ThreadUI, Settings, Notification,
         Threads, Navigation, Promise  */
/*global MockNavigatormozSetMessageHandler, MockNavigatormozApps,
         MockNavigatorWakeLock, MockOptionMenu,
         MockMessages, MockL10n,
         MockNavigatormozMobileMessage,
         Settings
*/

'use strict';

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
requireApp('sms/test/unit/mock_attachment.js');
requireApp('sms/test/unit/mock_black_list.js');
requireApp('sms/test/unit/mock_compose.js');
requireApp('sms/test/unit/mock_contacts.js');
requireApp('sms/test/unit/mock_messages.js');
requireApp('sms/test/unit/mock_message_manager.js');
requireApp('sms/test/unit/mock_threads.js');
requireApp('sms/test/unit/mock_thread_ui.js');
requireApp('sms/test/unit/mock_action_menu.js');
require('/test/unit/mock_settings.js');
require('/test/unit/mock_notify.js');
require('/test/unit/mock_navigation.js');

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
  'Notify',
  'OptionMenu',
  'Settings',
  'SettingsURL',
  'Threads',
  'ThreadUI',
  'Utils',
  'Navigation'
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
  });

  suiteTeardown(function() {
    navigator.mozSetMessageHandler = realSetMessageHandler;
    navigator.requestWakeLock = realWakeLock;
    navigator.mozApps = realMozApps;
    navigator.mozL10n = realMozL10n;
  });

  setup(function() {
    this.sinon.stub(window, 'alert');

    MockNavigatormozSetMessageHandler.mSetup();

    // simulate localization is ready
    this.sinon.stub(navigator.mozL10n, 'once').yields();

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
    var shareActivity, blobs, names;
    var arr = [];
    var panelPromise;

    setup(function() {
      shareActivity = {
        source: {
          name: 'share',
          data: {
            type: 'video/*',
            blobs: [
              new Blob(['test'], { type: 'video/x-video' }),
              new Blob(['test2'], { type: 'video/x-video' }),
              new Blob(),
              new Blob(),
              new Blob()
            ],
            filenames: ['testBlob1', 'testBlob2', 'testBlob3', 'testBlob4',
                        'testBlob5']
          }
        },
        postResult: sinon.stub(),
        postError: sinon.stub()
      };

      panelPromise = Promise.resolve();
      this.sinon.stub(Navigation, 'toPanel').returns(panelPromise);
    });

    teardown(function() {
      ActivityHandler.leaveActivity();
    });

    test('test for pushing an attachments to an array', function() {
      blobs = shareActivity.source.data.blobs;
      names = shareActivity.source.data.filenames;
      assert.ok(arr.length === 0);

      blobs.forEach(function(blob, idx) {
        var attachment = new Attachment(blob, {
          name: names[idx],
          isDraft: true
        });
        arr.push(attachment);
      });
      ThreadUI.cleanFields(true);
      //checks an array length after pushing the data to an array
      assert.ok(arr.length > 0);
    });

    test('moves to the composer panel', function() {

      MockNavigatormozSetMessageHandler.mTrigger('activity', shareActivity);

      sinon.assert.calledWith(Navigation.toPanel, 'composer');
    });

    test('Appends an attachment to the Compose field for each media file',
      function(done) {
      this.sinon.stub(Compose, 'append');

      MockNavigatormozSetMessageHandler.mTrigger('activity', shareActivity);

      panelPromise.then(function() {
        sinon.assert.calledWith(Compose.append, [
          sinon.match.instanceOf(Attachment),
          sinon.match.instanceOf(Attachment),
          sinon.match.instanceOf(Attachment),
          sinon.match.instanceOf(Attachment),
          sinon.match.instanceOf(Attachment)
        ]);
      }).then(done, done);
    });

    test('Attachment size over max mms should not be appended', function(done) {
      // Adjust mmsSizeLimitation for verifying alert popup when size over
      // limitation
      Settings.mmsSizeLimitation = 1;
      this.sinon.spy(Compose, 'append');

      MockNavigatormozSetMessageHandler.mTrigger('activity', shareActivity);

      panelPromise.then(function() {
        sinon.assert.notCalled(Compose.append);
        sinon.assert.calledWith(window.alert, 'files-too-large{"n":5}');
      }).then(done, done);
    });

    test('Should append images even when they are big', function(done) {
      shareActivity.source.data.blobs = [
        new Blob(['test'], { type: 'image/jpeg' }),
      ];

      Settings.mmsSizeLimitation = 1;
      this.sinon.spy(Compose, 'append');

      MockNavigatormozSetMessageHandler.mTrigger('activity', shareActivity);

      panelPromise.then(function() {
        sinon.assert.called(Compose.append);
        sinon.assert.notCalled(window.alert);
      }).then(done, done);
    });

    test('share message should switch application to request activity mode',
      function() {
        MockNavigatormozSetMessageHandler.mTrigger('activity', shareActivity);
        assert.isTrue(document.body.classList.contains(
          ActivityHandler.REQUEST_ACTIVITY_MODE_CLASS_NAME)
        );
      }
    );

    test('share message should set the current activity', function(done) {
      MockNavigatormozSetMessageHandler.mTrigger('activity', shareActivity);
      panelPromise.then(function() {
        assert.isTrue(ActivityHandler.isInActivity());
      }).then(done, done);
    });

    test('Appends URL to the Compose field for activity with URL data type',
      function(done) {
      this.sinon.stub(Compose, 'append');
      var shareURLActivity = {
        source: {
          name: 'share',
          data: {
            type: 'url',
            url: 'test_url'
          }
        },
        postResult: sinon.stub()
      };

      MockNavigatormozSetMessageHandler.mTrigger('activity', shareURLActivity);

      panelPromise.then(function() {
        sinon.assert.calledWith(
          Compose.append, shareURLActivity.source.data.url
        );
      }).then(done, done);
    });

    test('Call activity postError if no data to share', function() {
      this.sinon.spy(Compose, 'append');
      this.sinon.spy(ActivityHandler, 'leaveActivity');

      var activityWithoutData = {
        source: {
          name: 'share',
          data: {
            type: 'url'
          }
        },
        postResult: sinon.stub(),
        postError: sinon.stub()
      };

      MockNavigatormozSetMessageHandler.mTrigger(
        'activity',
        activityWithoutData
      );
      sinon.assert.called(ActivityHandler.leaveActivity);
      sinon.assert.called(activityWithoutData.postError);
      sinon.assert.notCalled(activityWithoutData.postResult);
      sinon.assert.notCalled(Compose.append);
    });

    test('Call activity postError on unknown activity data type', function() {
      this.sinon.spy(Compose, 'append');
      this.sinon.spy(ActivityHandler, 'leaveActivity');

      var unsupportedActivity = {
        source: {
          name: 'share',
          data: {
            type: 'multipart/mixed'
          }
        },
        postResult: sinon.stub(),
        postError: sinon.stub()
      };

      MockNavigatormozSetMessageHandler.mTrigger(
        'activity',
        unsupportedActivity
      );
      sinon.assert.called(ActivityHandler.leaveActivity);
      sinon.assert.called(unsupportedActivity.postError);
      sinon.assert.notCalled(unsupportedActivity.postResult);
      sinon.assert.notCalled(Compose.append);
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
      var contactName = '<&>'; // testing potentially unsafe characters
      var sendSpy;
      setup(function() {
        sendSpy = this.sinon.spy(window, 'Notification');
        this.sinon.stub(Contacts, 'findByPhoneNumber')
          .yields([{name: [contactName]}]);

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
      var sendSpy;

      setup(function() {
        sendSpy = this.sinon.spy(window, 'Notification');
        message.sender = phoneNumber;
        this.sinon.stub(Contacts, 'findByPhoneNumber')
          .yields([{
            name: [''],
            tel: {'value': phoneNumber}
          }]);
        MockNavigatormozApps.mTriggerLastRequestSuccess();
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

    suite('Close notification', function() {
      var closeSpy;
      var isDocumentHidden;

      suiteSetup(function(){
        Object.defineProperty(document, 'hidden', {
          configurable: true,
          get: function() {
            return isDocumentHidden;
          }
        });
      });

      suiteTeardown(function(){
        delete document.hidden;
      });

      setup(function() {
        closeSpy = this.sinon.spy(Notification.prototype, 'close');
        this.sinon.stub(document, 'addEventListener');
      });

      test('thread view already visible', function() {
        isDocumentHidden = false;
        this.sinon.stub(Threads, 'currentId', message.threadId);
        MockNavigatormozApps.mTriggerLastRequestSuccess();
        sinon.assert.notCalled(document.addEventListener);
        sinon.assert.notCalled(closeSpy);
      });

      test('Not in target thread view', function() {
        isDocumentHidden = true;
        MockNavigatormozApps.mTriggerLastRequestSuccess();
        sinon.assert.notCalled(document.addEventListener);
        sinon.assert.notCalled(closeSpy);
      });

      test('In target thread view and view is hidden', function() {
        isDocumentHidden = true;
        this.sinon.stub(Threads, 'currentId', message.threadId);
        MockNavigatormozApps.mTriggerLastRequestSuccess();
        sinon.assert.called(document.addEventListener);
        sinon.assert.notCalled(closeSpy);
        document.addEventListener.yield();
        sinon.assert.called(closeSpy);
      });
    });

    suite('receive class-0 message', function() {
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

  suite('Dual SIM behavior >', function() {
    var message;

    setup(function() {
      message = MockMessages.sms({
        iccId: '0'
      });

      this.sinon.stub(Settings, 'hasSeveralSim').returns(true);
      this.sinon.spy(window, 'Notification');

      MockNavigatormozSetMessageHandler.mTrigger('sms-received', message);
    });

    suite('contact retrieved (after getSelf)', function() {
      var contactName = 'contact';
      setup(function() {
        this.sinon.stub(Contacts, 'findByPhoneNumber')
          .yields([{name: [contactName]}]);

        MockNavigatormozApps.mTriggerLastRequestSuccess();
      });

      test('prefix the contact name with the SIM information', function() {
        var expected = 'dsds-notification-title-with-sim' +
         '{"sim":"sim-name-0","sender":"contact"}';
        sinon.assert.calledWith(window.Notification, expected);
      });
    });

    suite('contact without name (after getSelf)', function() {
      var phoneNumber = '+1111111111';

      setup(function() {
        message.sender = phoneNumber;
        this.sinon.stub(Contacts, 'findByPhoneNumber')
          .yields([{
            name: [''],
            tel: {value: phoneNumber}
          }]);
        MockNavigatormozApps.mTriggerLastRequestSuccess();
      });

      test('phone in notification title when contact without name', function() {
        var expected = 'dsds-notification-title-with-sim' +
          '{"sim":"sim-name-0","sender":"+1111111111"}';
        sinon.assert.calledWith(window.Notification, expected);
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

    suite('receive message when in thread with the same id', function() {
      setup(function() {
        this.sinon.stub(Notify, 'ringtone');
        this.sinon.stub(Notify, 'vibrate');

        var newMessage = MockMessages.sms();

        this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);
        Navigation.isCurrentPanel.withArgs(
          'thread', { id: newMessage.threadId }
        ).returns(true);

        MockNavigatormozSetMessageHandler.mTrigger('sms-received', newMessage);
      });

      test('play ringtone and vibrate even if in correct thread', function() {
        sinon.assert.called(Notify.ringtone);
        sinon.assert.called(Notify.vibrate);
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

        MockNavigatormozSetMessageHandler.mTrigger(
          'notification', notification
        );
        MockNavigatormozApps.mTriggerLastRequestSuccess();
      });

      test('an alert is displayed', function() {
        sinon.assert.calledWith(window.alert, title + '\n' + body);
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
      },
      postResult: sinon.stub()
    };

    var newActivity_empty = {
      source: {
        name: 'new',
        data: {
          number: '123'
        }
      },
      postResult: sinon.stub()
    };

    setup(function() {
      // find no contact in here
      this.sinon.stub(Contacts, 'findByPhoneNumber').callsArgWith(1, []);
      this.sinon.spy(Navigation, 'toPanel');
    });

    teardown(function() {
      ActivityHandler.leaveActivity();
    });

    test('Activity lock should be released properly', function() {
      MockNavigatormozSetMessageHandler.mTrigger('activity', newActivity);

      assert.isFalse(ActivityHandler.isLocked);
    });

    test('Should move to the composer', function() {
      MockNavigatormozSetMessageHandler.mTrigger('activity', newActivity);

      sinon.assert.calledWithMatch(Navigation.toPanel, 'composer', {
        activity: {
          number: '123',
          body: 'foo'
        }
      });
    });

    test('new message with empty msg', function() {
      // No message in the input field.
      Compose.mEmpty = true;
      this.sinon.stub(MockOptionMenu.prototype, 'show', function() {
        assert.ok(false, 'confirmation dialog should not show');
      });

      MockNavigatormozSetMessageHandler.mTrigger('activity', newActivity);
    });

    test('new message with no body, with empty msg', function() {
      // No message in the input field.
      Compose.mEmpty = true;
      this.sinon.stub(MockOptionMenu.prototype, 'show', function() {
        assert.ok(false, 'confirmation dialog should not show');
      });

      MockNavigatormozSetMessageHandler.mTrigger('activity', newActivity_empty);
    });

    test('new message with user input msg, discard it', function() {
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

      MockNavigatormozSetMessageHandler.mTrigger('activity', newActivity);

      // should be called after discarding
      sinon.assert.calledWithMatch(Navigation.toPanel, 'composer', {
        activity: {
          number: '123',
          body: 'foo'
        }
      });
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

      sinon.assert.notCalled(Navigation.toPanel);
    });

    test('new message should set the current activity', function() {
      MockNavigatormozSetMessageHandler.mTrigger('activity', newActivity);
      assert.isTrue(ActivityHandler.isInActivity());
    });

    test('new message should switch application to request activity mode',
      function() {
        MockNavigatormozSetMessageHandler.mTrigger('activity', newActivity);
        assert.isTrue(document.body.classList.contains(
          ActivityHandler.REQUEST_ACTIVITY_MODE_CLASS_NAME)
        );
      }
    );

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

  suite('setActivity', function() {
    teardown(function() {
      ActivityHandler.leaveActivity();
    });

    test('setting current activity should switch on activity mode', function() {
      ActivityHandler.setActivity({
        postResult: sinon.stub()
      });
      assert.isTrue(document.body.classList.contains(
          ActivityHandler.REQUEST_ACTIVITY_MODE_CLASS_NAME)
      );
    });

    test('setting current activity as null or undefined should throw exception',
      function() {
        assert.throws(function() {
          ActivityHandler.setActivity(null);
        });
        assert.throws(function() {
          ActivityHandler.setActivity();
        });
        assert.isFalse(document.body.classList.contains(
          ActivityHandler.REQUEST_ACTIVITY_MODE_CLASS_NAME)
        );
      }
    );
  });

  suite('leaveActivity', function() {
    test('should call postResult on current activity', function() {
      var mockActivity = {
        postResult: sinon.stub(),
        postError: sinon.stub()
      };
      ActivityHandler.setActivity(mockActivity);
      assert.isTrue(ActivityHandler.isInActivity());

      ActivityHandler.leaveActivity();
      sinon.assert.called(mockActivity.postResult);
      sinon.assert.notCalled(mockActivity.postError);
      assert.isFalse(ActivityHandler.isInActivity());
    });

    test('should call postError on current activity if reason specified',
      function() {
      var mockActivity = {
        postResult: sinon.stub(),
        postError: sinon.stub()
      };
      var testReason = 'Aaaa something went wrong!';

      ActivityHandler.setActivity(mockActivity);
      assert.isTrue(ActivityHandler.isInActivity());

      ActivityHandler.leaveActivity(testReason);
      sinon.assert.notCalled(mockActivity.postResult);
      sinon.assert.calledWith(mockActivity.postError, testReason);
      assert.isFalse(ActivityHandler.isInActivity());
    });
  });
});
