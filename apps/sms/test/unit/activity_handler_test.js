/*global Notify, Compose, MocksHelper, ActivityHandler, Contacts,
         Attachment, ThreadUI, Settings, Notification,
         Threads, Navigation, Promise, MessageManager, Utils  */
/*global MockNavigatormozSetMessageHandler, MockNavigatormozApps,
         MockNavigatorWakeLock,
         MockMessages, MockL10n, MockSilentSms,
         Settings,
         Utils
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
requireApp('sms/shared/test/unit/mocks/mock_l10n.js');

requireApp('sms/test/unit/mock_attachment.js');
requireApp('sms/test/unit/mock_compose.js');
requireApp('sms/test/unit/mock_contacts.js');
requireApp('sms/test/unit/mock_messages.js');
requireApp('sms/test/unit/mock_message_manager.js');
requireApp('sms/test/unit/mock_threads.js');
requireApp('sms/test/unit/mock_thread_ui.js');
require('/test/unit/mock_settings.js');
require('/test/unit/mock_notify.js');
require('/test/unit/mock_navigation.js');
require('/test/unit/mock_silent_sms.js');

requireApp('sms/js/utils.js');
requireApp('sms/test/unit/mock_utils.js');

requireApp('sms/js/activity_handler.js');

var mocksHelperForActivityHandler = new MocksHelper([
  'Attachment',
  'Compose',
  'Contacts',
  'MessageManager',
  'Notification',
  'NotificationHelper',
  'Notify',
  'Settings',
  'SettingsURL',
  'SilentSms',
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

  var isDocumentHidden;

  suiteSetup(function() {
    realSetMessageHandler = navigator.mozSetMessageHandler;
    navigator.mozSetMessageHandler = MockNavigatormozSetMessageHandler;

    realWakeLock = navigator.requestWakeLock;
    navigator.requestWakeLock = MockNavigatorWakeLock.requestWakeLock;

    realMozApps = navigator.mozApps;
    navigator.mozApps = MockNavigatormozApps;

    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: function() {
        return isDocumentHidden;
      }
    });
  });

  suiteTeardown(function() {
    navigator.mozSetMessageHandler = realSetMessageHandler;
    navigator.requestWakeLock = realWakeLock;
    navigator.mozApps = realMozApps;
    navigator.mozL10n = realMozL10n;
    delete document.hidden;
  });

  setup(function() {
    this.sinon.stub(Utils, 'alert').returns(Promise.resolve());
    isDocumentHidden = false;

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

    test('if app is run as inline activity', function() {
      this.sinon.stub(window.navigator, 'mozSetMessageHandler');
      this.sinon.stub(Navigation, 'getPanelName').returns('activity-xxx');

      ActivityHandler.init();

      // When app is run as activity we should listen for 'sms-received' and
      // 'notification' system messages - only for 'activity' message.
      sinon.assert.calledOnce(window.navigator.mozSetMessageHandler);
      sinon.assert.calledWith(
        window.navigator.mozSetMessageHandler, 'activity'
      );
    });
  });

  suite('"share" activity', function() {
    var shareActivity;
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
        sinon.assert.calledWith(Utils.alert, {
          id: 'attached-files-too-large',
          args: { n: 5, mmsSize: '0' }
        });
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
        sinon.assert.notCalled(Utils.alert);
      }).then(done, done);
    });

    test('Should append vcard attachment', function(done) {
      shareActivity.source.data.blobs = [
        new Blob(['test'], { type: 'text/x-vcard' }),
      ];

      this.sinon.spy(Compose, 'append');

      MockNavigatormozSetMessageHandler.mTrigger('activity', shareActivity);

      panelPromise.then(function() {
        sinon.assert.called(Compose.append);
      }).then(done, done);
    });

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

    setup(function(done) {
      message = MockMessages.sms();
      var checkSilentPromise = Promise.resolve(false);

      this.sinon.stub(MockSilentSms, 'checkSilentModeFor')
            .returns(checkSilentPromise);
      MockNavigatormozSetMessageHandler.mTrigger('sms-received', message);
      checkSilentPromise.then(() => done());
    });

    test('request the cpu wake lock', function() {
      var wakeLock = MockNavigatorWakeLock.mLastWakeLock;
      assert.ok(wakeLock);
      assert.equal(wakeLock.topic, 'cpu');
    });

    suite('contact retrieved (after getSelf)', function() {
      var contactName = '<&>'; // testing potentially unsafe characters
      var sendSpy;
      var findByPromise;

      setup(function() {
        sendSpy = this.sinon.spy(window, 'Notification');
        findByPromise = Promise.resolve(
          [ { name: [contactName] } ]
        );
        this.sinon.stub(Contacts, 'findByAddress').returns(findByPromise);

        MockNavigatormozApps.mTriggerLastRequestSuccess();
      });

      test('passes contact name in plain text', function(done) {
        findByPromise.then(() => {
          sinon.assert.called(sendSpy);
          var notification = sendSpy.firstCall.thisValue;
          assert.equal(notification.title, contactName);
        }).then(done, done);
      });
    });

    suite('null sms received', function() {
      var sendSpy, contactSpy;

      setup(function(done) {
        message.body = null;
        var checkSilentPromise = Promise.resolve(false);

        MockNavigatormozSetMessageHandler.mTrigger('sms-received', message);
        checkSilentPromise.then(() => done());
        sendSpy = this.sinon.spy(window, 'Notification');
        contactSpy = this.sinon.spy(Contacts, 'findByAddress');
        MockNavigatormozApps.mTriggerLastRequestSuccess();
      });

      test('null notification', function(done) {
        contactSpy.lastCall.returnValue.then(() => {
          sinon.assert.calledWithMatch(sendSpy, 'Pepito O\'Hare', { body: '' });
        }).then(done, done);
      });
    });

    suite('contact without name (after getSelf)', function() {
      var phoneNumber = '+1111111111';
      var sendSpy;

      setup(function(done) {
        sendSpy = this.sinon.spy(window, 'Notification');
        message.sender = phoneNumber;
        var contactPromise = Promise.resolve([{
          name: [''],
          tel: {'value': phoneNumber}
        }]);
        this.sinon.stub(Contacts, 'findByAddress').returns(contactPromise);
        MockNavigatormozApps.mTriggerLastRequestSuccess();

        contactPromise.then(() => done(), done);
      });

      test('phone in notification title when contact without name', function() {
        sinon.assert.called(sendSpy);
        var notification = sendSpy.firstCall.thisValue;
        assert.equal(notification.title, phoneNumber);
      });
    });

    suite('[Email]contact without name (after getSelf)', function() {
      var emailAddress = 'a@b.com';
      var sendSpy;

      setup(function(done) {
        sendSpy = this.sinon.spy(window, 'Notification');
        message.sender = emailAddress;
        var contactPromise = Promise.resolve([{
          name: [''],
          email: {'value': emailAddress}
        }]);
        this.sinon.stub(Contacts, 'findByAddress').returns(contactPromise);
        MockNavigatormozApps.mTriggerLastRequestSuccess();

        contactPromise.then(() => done(), done);
      });

      test('email in notification title when contact without name', function() {
        sinon.assert.called(sendSpy);
        var notification = sendSpy.firstCall.thisValue;
        assert.equal(notification.title, emailAddress);
      });
    });

    suite('after getSelf', function() {
      var sendSpy, contactSpy;
      setup(function(done) {
        sendSpy = this.sinon.spy(window, 'Notification');
        contactSpy = this.sinon.spy(Contacts, 'findByAddress');
        MockNavigatormozApps.mTriggerLastRequestSuccess();
        contactSpy.lastCall.returnValue.then(() => done(), done);
      });

      test('a notification is sent', function() {
        sinon.assert.called(sendSpy);
        var notification = sendSpy.firstCall.thisValue;
        assert.equal(notification.body, message.body);
        assert.deepEqual(notification.data, {
          id: message.id,
          threadId: message.threadId
        });
        assert.equal(notification.icon, 'sms');
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

      test('In target thread view and view is hidden', function(done) {
        isDocumentHidden = true;
        this.sinon.stub(Threads, 'currentId', message.threadId);
        var contactSpy = this.sinon.spy(Contacts, 'findByAddress');
        MockNavigatormozApps.mTriggerLastRequestSuccess();

        contactSpy.lastCall.returnValue.then(() => {
          sinon.assert.called(document.addEventListener);
          sinon.assert.notCalled(closeSpy);
          document.addEventListener.yield();
          sinon.assert.called(closeSpy);
        }).then(done, done);
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

      test('an alert is displayed', function() {
        sinon.assert.calledWith(
          Utils.alert,
          { raw: 'body' },
          { raw: 'sender' }
        );
      });
    });

    suite('receive class-0 message without content', function() {
      setup(function() {
        message = MockMessages.sms({
          body: null,
          messageClass: 'class-0'
        });
        MockNavigatormozSetMessageHandler.mTrigger('sms-received', message);
        MockNavigatormozApps.mTriggerLastRequestSuccess();
      });

      test('an alert is displayed with empty content', function() {
        sinon.assert.calledWith(
          Utils.alert,
          { raw: '' },
          { raw: 'sender' }
        );
      });
    });
  });

  suite('Silent mode', function() {
    var message;

    setup(function() {
      message = MockMessages.sms();
      this.sinon.stub(Navigation, 'isCurrentPanel').returns(true);
    });

    test('sender with Silent Mode enabled - not play ringtone', function(done) {
      this.sinon.stub(Notify, 'ringtone');
      var promise = Promise.resolve(true);
      this.sinon.stub(MockSilentSms, 'checkSilentModeFor').returns(promise);
      // trigger message
      MockNavigatormozSetMessageHandler.mTrigger('sms-received', message);
      promise.then(function() {
        sinon.assert.notCalled(Notify.ringtone);
      }).then(done, done);
    });

    test('sender with Silent Mode disabled - play ringtone', function(done) {
      this.sinon.stub(Notify, 'ringtone', function _assertionFunction() {
        done();
      });
      var promise = Promise.resolve(false);
      this.sinon.stub(MockSilentSms, 'checkSilentModeFor').returns(promise);
      MockNavigatormozSetMessageHandler.mTrigger('sms-received', message);
    });
  });

  suite('Dual SIM behavior >', function() {
    var message;

    setup(function(done) {
      message = MockMessages.sms({
        iccId: '0'
      });
      var checkSilentPromise = Promise.resolve(false);
      this.sinon.stub(MockSilentSms, 'checkSilentModeFor')
        .returns(checkSilentPromise);
      this.sinon.stub(Settings, 'hasSeveralSim').returns(true);
      this.sinon.spy(window, 'Notification');

      MockNavigatormozSetMessageHandler.mTrigger('sms-received', message);
      checkSilentPromise.then(() => done());
    });

    suite('contact retrieved (after getSelf)', function() {
      var contactName = 'contact';
      setup(function(done) {
        var contactPromise = Promise.resolve([{name: [contactName]}]);

        this.sinon.stub(Contacts, 'findByAddress').returns(contactPromise);

        MockNavigatormozApps.mTriggerLastRequestSuccess();

        contactPromise.then(() => done(), done);
      });

      test('prefix the contact name with the SIM information', function() {
        var expected = 'dsds-notification-title-with-sim' +
          '{"sim":"sim-name-0","sender":"contact"}';
        sinon.assert.calledWith(window.Notification, expected);
      });
    });

    suite('contact without name (after getSelf)', function() {
      var phoneNumber = '+1111111111';

      setup(function(done) {
        message.sender = phoneNumber;
        var contactPromise = Promise.resolve([{
          name: [''],
          tel: {value: phoneNumber}
        }]);
        this.sinon.stub(Contacts, 'findByAddress').returns(contactPromise);
        MockNavigatormozApps.mTriggerLastRequestSuccess();

        contactPromise.then(() => done(), done);
      });

      test('phone in notification title when contact without name', function() {
        var expected = 'dsds-notification-title-with-sim' +
          '{"sim":"sim-name-0","sender":"+1111111111"}';
        sinon.assert.calledWith(window.Notification, expected);
      });
    });

    suite('[Email]contact without name (after getSelf)', function() {
      var emailAddress = 'a@b.com';

      setup(function(done) {
        message.sender = emailAddress;
        var contactPromise = Promise.resolve([{
          name: [''],
          email: {value: emailAddress}
        }]);
        this.sinon.stub(Contacts, 'findByAddress').returns(contactPromise);
        MockNavigatormozApps.mTriggerLastRequestSuccess();

        contactPromise.then(() => done(), done);
      });

      test('email in notification title when contact without name', function() {
        var expected = 'dsds-notification-title-with-sim' +
          '{"sim":"sim-name-0","sender":"a@b.com"}';
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
        var notification = {
          title: title,
          body: body,
          imageURL: 'url',
          tag: 'threadId:' + threadId,
          clicked: true,
          data: {
            id: messageId,
            threadId: threadId
          }
        };

        MockNavigatormozSetMessageHandler.mTrigger(
          'notification', notification
        );
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
      var newMessage;
      setup(function() {
        this.sinon.stub(MockSilentSms, 'checkSilentModeFor')
          .returns(Promise.resolve(false));

        newMessage = MockMessages.sms();

        this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);
        Navigation.isCurrentPanel.withArgs(
          'thread', { id: newMessage.threadId }
        ).returns(true);
      });

      test('play ringtone and vibrate even if in correct thread',
           function(done) {
        this.sinon.stub(Notify, 'ringtone', function _assertionFunction() {
          done();
        });
        MockNavigatormozSetMessageHandler.mTrigger('sms-received', newMessage);
      });
    });
  });

  suite('user removed the notification', function() {
    setup(function() {
      this.sinon.spy(ActivityHandler, 'handleMessageNotification');
      this.sinon.spy(MockNavigatormozApps, 'getSelf');
      this.sinon.spy(Navigation, 'ensureCurrentPanel');

      MockNavigatormozSetMessageHandler.mTrigger('notification', {
        title: 'title',
        body: 'body',
        imageURL: 'url?id=1&threadId=1',
        tag: 'threadId:1',
        // When notification is removed "clicked" property is false
        clicked: false
      });
    });

    test('navigation is forced to set current panel', function() {
      sinon.assert.called(Navigation.ensureCurrentPanel);

      sinon.assert.notCalled(MockNavigatormozApps.getSelf);
      sinon.assert.notCalled(ActivityHandler.handleMessageNotification);
    });
  });

  suite('"new" activity', function() {
    function onceNewActivityCompleted() {
      sinon.assert.called(ActivityHandler._onNewActivity);
      return ActivityHandler._onNewActivity.lastCall.returnValue;
    }

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

    var newActivity_email = {
      source: {
        name: 'new',
        data: {
          target: 'abc@exmple.com',
          body: 'foo'
        }
      },
      postResult: sinon.stub()
    };

    var threadDeferred;

    setup(function() {
      // find no contact in here
      this.sinon.stub(Contacts, 'findByPhoneNumber').callsArgWith(1, []);
      // configure findThreadFromNumber
      threadDeferred = Utils.Promise.defer();
      this.sinon.stub(MessageManager, 'findThreadFromNumber')
                .returns(threadDeferred.promise);
      this.sinon.spy(Navigation, 'toPanel');
      this.sinon.spy(Threads, 'registerMessage');
      this.sinon.spy(ActivityHandler, '_onNewActivity');
      // we have to call init again, otherwise the map of handlers would
      // still contain the non-mocked _onNewActivity
      ActivityHandler.init();
    });

    teardown(function() {
      ActivityHandler.leaveActivity();
    });

    test('Should move to the composer and set activity', function(done) {
      MockNavigatormozSetMessageHandler.mTrigger('activity', newActivity);
      threadDeferred.reject(new Error('No thread for this test'));

      onceNewActivityCompleted().then(function() {
        assert.isTrue(ActivityHandler.isInActivity());
        sinon.assert.calledWithMatch(Navigation.toPanel, 'composer', {
          activity: {
            number: '123',
            body: 'foo'
          }
        });
      }).then(done,done);
    });

    test('new message with body only', function(done) {
      var activity = {
        source: {
          name: 'new',
          data: { body: 'foo' }
        },
        postResult: () => {}
      };
      MockNavigatormozSetMessageHandler.mTrigger('activity', activity);

      onceNewActivityCompleted().then(() => {
        sinon.assert.notCalled(MessageManager.findThreadFromNumber);
        sinon.assert.notCalled(Contacts.findByPhoneNumber);

        sinon.assert.calledWithMatch(
          Navigation.toPanel, 'composer', { activity: { body: 'foo' } }
        );
      }).then(done,done);
    });

    test('new message with email', function(done) {
      MockNavigatormozSetMessageHandler.mTrigger('activity', newActivity_email);
      threadDeferred.reject(new Error('No thread for this test'));

      onceNewActivityCompleted().then(function() {
        assert.isTrue(ActivityHandler.isInActivity());
        sinon.assert.calledWithMatch(Navigation.toPanel, 'composer', {
          activity: {
            number: newActivity_email.source.data.target,
            body: newActivity_email.source.data.body
          }
        });
      }).then(done,done);
    });

    test('when no existing thread, but a contact: new message with contact',
    function(done) {
      MockNavigatormozSetMessageHandler.mTrigger('activity', newActivity);
      threadDeferred.reject(new Error('No thread for this test'));

      Contacts.findByPhoneNumber.restore();
      this.sinon.stub(Contacts, 'findByAddress').returns(
        Promise.resolve([{ name: ['foo'] }])
      );

      onceNewActivityCompleted().then(function() {
        sinon.assert.calledWithMatch(Navigation.toPanel, 'composer', {
          activity: {
            contact: {number: '123', name: 'foo', source: 'contacts'},
            number: '123',
            body: 'foo'
          }
        });
      }).then(done,done);
    });

    test('when there is an existing thread, should navigate to the thread',
    function(done) {
      MockNavigatormozSetMessageHandler.mTrigger('activity', newActivity);
      // this time we found a thread
      threadDeferred.resolve(42);

      onceNewActivityCompleted().then(function() {
        sinon.assert.notCalled(Contacts.findByPhoneNumber);
        sinon.assert.calledWithMatch(
          Navigation.toPanel, 'thread', { id: 42, focusComposer: true }
        );
      }).then(done,done);
    });
  });

  suite('handle message notification', function() {
    var message, getMessagePromise;

    setup(function() {
      message = MockMessages.sms();
      getMessagePromise = Promise.resolve(message);

      this.sinon.stub(Utils, 'confirm');
      this.sinon.stub(Threads, 'has');
      this.sinon.stub(Threads, 'registerMessage');
      this.sinon.stub(MessageManager, 'getMessage').returns(getMessagePromise);
      this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);
      this.sinon.stub(Navigation, 'toPanel');
      this.sinon.stub(Compose, 'clear');
      this.sinon.stub(Compose, 'isEmpty').returns(true);
      this.sinon.stub(ThreadUI, 'cleanFields');
    });

    test('when message belongs to currently active thread', function() {
      Navigation.isCurrentPanel.withArgs(
        'thread', { id: message.threadId }
      ).returns(true);

      ActivityHandler.handleMessageNotification(message);

      sinon.assert.notCalled(MessageManager.getMessage);
      sinon.assert.notCalled(Utils.confirm);
      sinon.assert.notCalled(Navigation.toPanel);
    });

    suite('When compose is not empty', function() {
      setup(function() {
        Compose.isEmpty.returns(false);
      });

      test('if user does not want to discard draft', function(done) {
        var confirmPromise = Promise.reject();
        Utils.confirm.returns(confirmPromise);

        ActivityHandler.handleMessageNotification(message);

        getMessagePromise.then(() => confirmPromise).catch(() => {
          sinon.assert.notCalled(Compose.clear);
          sinon.assert.notCalled(ThreadUI.cleanFields);
          sinon.assert.calledWith(
            Utils.confirm,
            'discard-new-message',
            'unsent-message-title',
            { text: 'unsent-message-option-discard', className: 'danger' }
          );
        }).then(done, done);
      });

      test('if user wants to discard draft', function(done) {
        var confirmPromise = Promise.resolve();
        Utils.confirm.returns(confirmPromise);

        ActivityHandler.handleMessageNotification(message);

        getMessagePromise.then(() => confirmPromise).then(() => {
          sinon.assert.called(ThreadUI.cleanFields);
          sinon.assert.calledWith(
            Utils.confirm,
            'discard-new-message',
            'unsent-message-title',
            { text: 'unsent-message-option-discard', className: 'danger' }
          );
        }).then(done, done);
      });

      test('if message belongs to currently active thread', function() {
        Navigation.isCurrentPanel.withArgs(
          'thread', { id: message.threadId }
        ).returns(true);

        ActivityHandler.handleMessageNotification(message);

        // It shouldn't matter if message input has any text or not since target
        // thread is already opened
        sinon.assert.notCalled(MessageManager.getMessage);
        sinon.assert.notCalled(Utils.confirm);
        sinon.assert.notCalled(Navigation.toPanel);
      });
    });

    test('registers message in Threads if no related thread', function(done) {
      Threads.has.withArgs(message.threadId).returns(false);

      ActivityHandler.handleMessageNotification(message);

      getMessagePromise.then(() => {
        sinon.assert.calledWith(Threads.registerMessage, message);
      }).then(done, done);
    });

    test('does not register message if thread for this message exists',
      function(done) {
      Threads.has.withArgs(message.threadId).returns(true);

      ActivityHandler.handleMessageNotification(message);

      getMessagePromise.then(() => {
        sinon.assert.notCalled(Threads.registerMessage);
      }).then(done, done);
    });
  });

  suite('setActivity', function() {
    teardown(function() {
      ActivityHandler.leaveActivity();
    });

    test('setting current activity as null or undefined should throw exception',
      function() {
        assert.throws(function() {
          ActivityHandler.setActivity(null);
        });
        assert.throws(function() {
          ActivityHandler.setActivity();
        });
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
