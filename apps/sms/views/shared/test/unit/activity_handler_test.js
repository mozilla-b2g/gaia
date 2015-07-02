/*global Notify, Compose, MocksHelper, ActivityHandler, Contacts,
         Attachment, ConversationView,
         Threads, Navigation, MessageManager,
         MockNavigatormozSetMessageHandler, MockNavigatormozApps,
         MockNavigatorWakeLock,
         MockMessages, MockL10n, MockSilentSms,
         Settings,
         SMIL,
         Utils,
         ActivityShim,
         ActivityClient,
         Drafts,
         NotificationHelper
*/

'use strict';

requireApp(
  'sms/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js'
);
requireApp('sms/shared/test/unit/mocks/mock_navigator_wake_lock.js');
requireApp('sms/shared/test/unit/mocks/mock_notification_helper.js');
requireApp('sms/shared/test/unit/mocks/mock_navigator_moz_apps.js');
requireApp('sms/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('sms/shared/test/unit/mocks/mock_settings_url.js');
requireApp('sms/shared/test/unit/mocks/mock_l10n.js');

require('/views/shared/test/unit/mock_attachment.js');
require('/views/shared/test/unit/mock_compose.js');
require('/views/shared/test/unit/mock_contacts.js');
require('/views/shared/test/unit/mock_messages.js');
require('/services/test/unit/mock_message_manager.js');
require('/services/test/unit/mock_threads.js');
require('/services/test/unit/activity/mock_activity_shim.js');
require('/services/test/unit/activity/mock_activity_client.js');
require('/views/shared/test/unit/mock_conversation.js');
require('/views/shared/test/unit/mock_settings.js');
require('/views/shared/test/unit/mock_notify.js');
require('/views/shared/test/unit/mock_navigation.js');
require('/views/shared/test/unit/mock_silent_sms.js');
require('/views/shared/test/unit/mock_smil.js');
require('/services/test/unit/mock_drafts.js');

require('/views/shared/js/utils.js');
require('/views/shared/test/unit/mock_utils.js');

require('/views/shared/js/activity_handler.js');

var mocksHelperForActivityHandler = new MocksHelper([
  'Attachment',
  'Compose',
  'Contacts',
  'Draft',
  'Drafts',
  'MessageManager',
  'NotificationHelper',
  'Notify',
  'Settings',
  'SettingsURL',
  'SilentSms',
  'SMIL',
  'Threads',
  'ConversationView',
  'Utils',
  'Navigation',
  'ActivityShim',
  'ActivityClient'
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

    this.sinon.stub(ActivityShim);
    this.sinon.stub(ActivityClient);

    ActivityHandler.init();
  });

  teardown(function() {
    MockNavigatormozSetMessageHandler.mTeardown();
    MockNavigatormozApps.mTeardown();
    MockNavigatorWakeLock.mTeardown();
  });

  suite('init', function() {
    setup(function() {
      this.sinon.stub(window.navigator, 'mozSetMessageHandler');
    });

    test('if app is run as inline activity', function() {
      ActivityShim.hasPendingRequest.returns(true);

      ActivityHandler.init();

      sinon.assert.calledOnce(ActivityShim.init);
      sinon.assert.calledOnce(ActivityClient.init);

      sinon.assert.calledWith(ActivityClient.on, 'new-activity-request');
      sinon.assert.calledWith(ActivityClient.on, 'share-activity-request');

      // When app is run as activity we should not listen for 'sms-received' and
      // 'notification' system messages.
      sinon.assert.notCalled(window.navigator.mozSetMessageHandler);
    });

    test('if app is run in non-activity mode', function() {
      ActivityShim.hasPendingRequest.returns(false);

      ActivityHandler.init();

      sinon.assert.notCalled(ActivityShim.init);
      sinon.assert.notCalled(ActivityClient.init);

      sinon.assert.calledTwice(window.navigator.mozSetMessageHandler);
      sinon.assert.calledWith(
        window.navigator.mozSetMessageHandler, 'sms-received'
      );
      sinon.assert.calledWith(
        window.navigator.mozSetMessageHandler, 'notification'
      );
    });
  });

  suite('"share" activity', function() {
    var activityData;

    function onceShareActivityCompleted() {
      sinon.assert.called(ActivityHandler._onShareActivity);
      return ActivityHandler._onShareActivity.lastCall.returnValue;
    }

    setup(function() {
      this.sinon.spy(ActivityHandler, '_onShareActivity');
      this.sinon.spy(Navigation, 'toPanel');
      this.sinon.spy(Drafts, 'add');
      this.sinon.spy(Drafts, 'store');
      this.sinon.spy(Drafts, 'request');

      activityData = {
        type: 'video/*',
        blobs: [
          new Blob(['test'], { type: 'video/x-video' }),
          new Blob(['test2'], { type: 'video/x-video' }),
          new Blob(),
          new Blob(),
          new Blob()
        ],
        filenames: [
          'testBlob1', 'testBlob2', 'testBlob3', 'testBlob4', 'testBlob5'
        ]
      };

      ActivityShim.hasPendingRequest.returns(true);
      ActivityHandler.init();
    });

    test('moves to the composer panel after saving draft', function(done) {
      ActivityClient.on.withArgs('share-activity-request').yield(
        activityData
      );

      onceShareActivityCompleted().then(() => {
        sinon.assert.calledWithMatch(Drafts.add, {
          recipients: null,
          type: 'mms',
          content: [
            sinon.match.instanceOf(Attachment),
            sinon.match.instanceOf(Attachment),
            sinon.match.instanceOf(Attachment),
            sinon.match.instanceOf(Attachment),
            sinon.match.instanceOf(Attachment)
          ]
        });
        sinon.assert.called(Drafts.store);
        sinon.assert.callOrder(Drafts.request, Drafts.add, Drafts.store);
        sinon.assert.calledWith(
          Navigation.toPanel,
          'composer', { draftId: 'draftId', focusComposer: sinon.match.falsy }
        );
      }).then(done, done);
    });

    test('Attachment size over max mms should not be appended', function(done) {
      // Adjust mmsSizeLimitation for verifying alert popup when size over
      // limitation.
      Settings.mmsSizeLimitation = 1;

      ActivityClient.on.withArgs('share-activity-request').yield(
        activityData
      );

      sinon.assert.calledWith(Utils.alert, {
        id: 'attached-files-too-large',
        args: { n: 5, mmsSize: '0' }
      });

      Utils.alert.lastCall.returnValue.then(() => {
        sinon.assert.calledWithExactly(ActivityClient.postResult);
        sinon.assert.notCalled(Navigation.toPanel);
      }).then(done, done);
    });

    test('Should append images even when they are big', function(done) {
      activityData.blobs = [new Blob(['test'], { type: 'image/jpeg' })];

      Settings.mmsSizeLimitation = 1;

      ActivityClient.on.withArgs('share-activity-request').yield(
        activityData
      );

      sinon.assert.notCalled(Utils.alert);

      onceShareActivityCompleted().then(() => {
        sinon.assert.calledWithMatch(Drafts.add, {
          recipients: null,
          type: 'mms',
          content: [sinon.match.instanceOf(Attachment)]
        });
        sinon.assert.called(Drafts.store);
        sinon.assert.callOrder(Drafts.request, Drafts.add, Drafts.store);
        sinon.assert.calledWith(
          Navigation.toPanel,
          'composer', { draftId: 'draftId', focusComposer: sinon.match.falsy }
        );
      }).then(done, done);
    });

    test('Should append vcard attachment', function(done) {
      activityData.blobs = [new Blob(['test'], { type: 'text/x-vcard' })];

      this.sinon.spy(Compose, 'append');

      ActivityClient.on.withArgs('share-activity-request').yield(
        activityData
      );

      sinon.assert.notCalled(Utils.alert);

      onceShareActivityCompleted().then(() => {
        sinon.assert.calledWithMatch(Drafts.add, {
          recipients: null,
          type: 'mms',
          content: [sinon.match.instanceOf(Attachment)]
        });
        sinon.assert.called(Drafts.store);
        sinon.assert.callOrder(Drafts.request, Drafts.add, Drafts.store);
        sinon.assert.calledWith(
          Navigation.toPanel,
          'composer', { draftId: 'draftId', focusComposer: sinon.match.falsy }
        );
      }).then(done, done);
    });

    test('Appends URL to the Compose field for activity with URL data type',
    function(done) {
      var urlActivityData = {
        type: 'url',
        url: 'test_url'
      };

      ActivityClient.on.withArgs('share-activity-request').yield(
        urlActivityData
      );

      sinon.assert.notCalled(Utils.alert);

      onceShareActivityCompleted().then(() => {
        sinon.assert.calledWithMatch(Drafts.add, {
          recipients: null,
          type: 'sms',
          content: [urlActivityData.url]
        });
        sinon.assert.called(Drafts.store);
        sinon.assert.callOrder(Drafts.request, Drafts.add, Drafts.store);
        sinon.assert.calledWith(
          Navigation.toPanel,
          'composer', { draftId: 'draftId', focusComposer: sinon.match.falsy }
        );
      }).then(done, done);
    });

    test('Call activity postError if no data to share', function() {
      ActivityClient.on.withArgs('share-activity-request').yield({
        type: 'url'
      });

      sinon.assert.notCalled(Navigation.toPanel);
      sinon.assert.notCalled(ActivityClient.postResult);
      sinon.assert.calledOnce(ActivityClient.postError);
      sinon.assert.calledWith(
        ActivityClient.postError, 'No data to share found!'
      );
    });

    test('Call activity postError on unknown activity data type', function() {
      ActivityClient.on.withArgs('share-activity-request').yield({
        type: 'multipart/mixed'
      });

      sinon.assert.notCalled(Navigation.toPanel);
      sinon.assert.notCalled(ActivityClient.postResult);
      sinon.assert.calledOnce(ActivityClient.postError);
      sinon.assert.calledWith(
        ActivityClient.postError,
        'Unsupported activity data type: multipart/mixed'
      );
    });
  });

  suite('sms received', function() {
    var message, sendStub, notificationStub;

    setup(function(done) {
      message = MockMessages.sms();
      var checkSilentPromise = Promise.resolve(false);
      notificationStub = sinon.stub({
        addEventListener: () => {},
        close: () => {}
      });

      this.sinon.stub(MockSilentSms, 'checkSilentModeFor')
            .returns(checkSilentPromise);
      sendStub = this.sinon.stub(NotificationHelper, 'send')
        .returns(notificationStub);
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
      var findByPromise;

      setup(function(done) {
        findByPromise = Promise.resolve(
          [ { name: [contactName] } ]
        );
        this.sinon.stub(Contacts, 'findByAddress').returns(findByPromise);

        MockNavigatormozApps.mTriggerLastRequestSuccess().then(done, done);
      });

      test('passes contact name in plain text', function() {
        sinon.assert.calledWith(sendStub, contactName);
      });
    });

    suite('null sms received', function() {
      var contactSpy;

      setup(function(done) {
        message.body = null;

        MockNavigatormozSetMessageHandler.mTrigger('sms-received', message);
        contactSpy = this.sinon.spy(Contacts, 'findByAddress');
        MockNavigatormozApps.mTriggerLastRequestSuccess().then(done, done);
      });

      test('null notification', function() {
        sinon.assert.calledWithMatch(sendStub,
          'Pepito O\'Hare', { bodyL10n: { raw: '' } });
      });
    });

    suite('contact without name (after getSelf)', function() {
      var phoneNumber = '+1111111111';

      setup(function(done) {
        message.sender = phoneNumber;
        var contactPromise = Promise.resolve([{
          name: [''],
          tel: {'value': phoneNumber}
        }]);
        this.sinon.stub(Contacts, 'findByAddress').returns(contactPromise);
        MockNavigatormozApps.mTriggerLastRequestSuccess().then(done, done);
      });

      test('phone in notification title when contact without name', function() {
        sinon.assert.calledWith(sendStub, phoneNumber);
      });
    });

    suite('[Email]contact without name (after getSelf)', function() {
      var emailAddress = 'a@b.com';

      setup(function(done) {
        message.sender = emailAddress;
        var contactPromise = Promise.resolve([{
          name: [''],
          email: {'value': emailAddress}
        }]);
        this.sinon.stub(Contacts, 'findByAddress').returns(contactPromise);
        MockNavigatormozApps.mTriggerLastRequestSuccess().then(done, done);
      });

      test('email in notification title when contact without name', function() {
        sinon.assert.calledWith(sendStub, emailAddress);
      });
    });

    suite('after getSelf', function() {
      var contactSpy;
      setup(function(done) {
        contactSpy = this.sinon.spy(Contacts, 'findByAddress');
        MockNavigatormozApps.mTriggerLastRequestSuccess().then(done, done);
      });

      test('a notification is sent', function() {
        sinon.assert.calledWith(sendStub, sinon.match.any, {
          icon: 'sms',
          bodyL10n: { raw: message.body },
          data: {
            id: message.id,
            threadId: message.threadId
          },
          closeOnClick: false,
          tag: sinon.match.any
        });
      });

      test('the lock is released', function() {
        assert.ok(MockNavigatorWakeLock.mLastWakeLock.released);
      });

      suite('click on the notification', function() {
        setup(function() {
          this.sinon.stub(ActivityHandler, 'handleMessageNotification');
          notificationStub.addEventListener.withArgs('click').yield();
        });

        test('launches the app', function() {
          assert.ok(MockNavigatormozApps.mAppWasLaunched);
        });
      });
    });

    suite('Close notification', function() {

      setup(function() {
        this.sinon.stub(document, 'addEventListener');
      });

      test('thread view already visible', function() {
        isDocumentHidden = false;
        MockNavigatormozApps.mTriggerLastRequestSuccess();
        sinon.assert.notCalled(notificationStub.addEventListener);
        sinon.assert.notCalled(notificationStub.close);
      });

      test('Not in target thread view', function() {
        isDocumentHidden = true;
        MockNavigatormozApps.mTriggerLastRequestSuccess();
        sinon.assert.notCalled(notificationStub.addEventListener);
        sinon.assert.notCalled(notificationStub.close);
      });

      test('In target thread view and view is hidden', function(done) {
        isDocumentHidden = true;
        this.sinon.stub(Navigation, 'isCurrentPanel')
          .withArgs('thread', {id: message.threadId}).returns(true);

        MockNavigatormozApps.mTriggerLastRequestSuccess().then(() => {
          sinon.assert.called(document.addEventListener);
          sinon.assert.notCalled(notificationStub.close);
          document.addEventListener.yield();
          sinon.assert.called(notificationStub.close);
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

  suite('mms received', function() {
    function simulateMessageReceived(message) {
      MockNavigatormozSetMessageHandler.mTrigger('sms-received', message);
      return MockSilentSms.checkSilentModeFor.lastCall.returnValue.then(
        () => MockNavigatormozApps.mTriggerLastRequestSuccess()
      );
    }

    setup(function() {
      var notificationStub = sinon.stub({
        addEventListener: () => {},
        close: () => {}
      });

      this.sinon.stub(MockSilentSms, 'checkSilentModeFor').returns(
        Promise.resolve(false)
      );
      this.sinon.stub(NotificationHelper, 'send').returns(notificationStub);
    });

    test('MMS without subject nor text', function(done) {
      var message = MockMessages.mms();
      simulateMessageReceived(message).then(() => {
        sinon.assert.calledWithMatch(
          NotificationHelper.send,
          sinon.match.string, { bodyL10n: 'mms-message' }
        );
      }).then(done, done);
    });

    test('MMS with subject', function(done) {
      var message = MockMessages.mms({ subject: 'subject' });
      simulateMessageReceived(message).then(() => {
        sinon.assert.calledWithMatch(
          NotificationHelper.send,
          sinon.match.string, { bodyL10n: { raw: 'subject' } }
        );
      }).then(done, done);
    });

    test('MMS with text', function(done) {
      var message = MockMessages.mms();
      SMIL.mParsed = [{ text: 'some text' }];

      simulateMessageReceived(message).then(() => {
        sinon.assert.calledWithMatch(
          NotificationHelper.send,
          sinon.match.string, { bodyL10n: { raw: 'some text' } }
        );
      }).then(done, done);
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
    var message, notificationStub, sim;

    setup(function(done) {
      sim = 'SIM 1';
      message = MockMessages.sms({
        iccId: '0'
      });
      var checkSilentPromise = Promise.resolve(false);
      var simPromise = Promise.resolve(sim);

      notificationStub = sinon.stub({
        addEventListener: () => {},
        close: () => {}
      });
      this.sinon.stub(MockSilentSms, 'checkSilentModeFor').returns(
        checkSilentPromise
      );
      this.sinon.stub(NotificationHelper, 'send').returns(notificationStub);
      this.sinon.stub(Settings, 'hasSeveralSim').returns(true);
      this.sinon.stub(Utils, 'getSimNameByIccId').returns(simPromise);

      MockNavigatormozSetMessageHandler.mTrigger('sms-received', message);
      checkSilentPromise.then(() => done());
    });

    suite('contact retrieved (after getSelf)', function() {
      var contactName = 'contact';
      setup(function(done) {
        var contactPromise = Promise.resolve([{name: [contactName]}]);

        this.sinon.stub(Contacts, 'findByAddress').returns(contactPromise);

        MockNavigatormozApps.mTriggerLastRequestSuccess().then(done, done);
      });

      test('prefix the contact name with the SIM information', function() {
        var expected = {  
          args: { sender: 'contact', sim: sim },
          id: 'dsds-notification-title-with-sim'
        };
        sinon.assert.calledWith(NotificationHelper.send, expected);
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
        MockNavigatormozApps.mTriggerLastRequestSuccess().then(done, done);
      });

      test('phone in notification title when contact without name', function() {
        var expected = {  
          args: { sender: '+1111111111', sim: sim },
          id: 'dsds-notification-title-with-sim'
        };
        sinon.assert.calledWith(NotificationHelper.send, expected);
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
        MockNavigatormozApps.mTriggerLastRequestSuccess().then(done, done);
      });

      test('email in notification title when contact without name', function() {
        var expected = {  
          args: { sender: 'a@b.com', sim: sim },
          id: 'dsds-notification-title-with-sim'
        };
        sinon.assert.calledWith(NotificationHelper.send, expected);
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

  test('user removed the notification', function() {
    this.sinon.spy(ActivityHandler, 'handleMessageNotification');
    this.sinon.spy(MockNavigatormozApps, 'getSelf');

    MockNavigatormozSetMessageHandler.mTrigger('notification', {
      title: 'title',
      body: 'body',
      imageURL: 'url?id=1&threadId=1',
      tag: 'threadId:1',
      // When notification is removed "clicked" property is false
      clicked: false
    });
    sinon.assert.notCalled(MockNavigatormozApps.getSelf);
    sinon.assert.notCalled(ActivityHandler.handleMessageNotification);
  });

  suite('"new" activity', function() {
    var numberActivityData, emailActivityData;

    function onceNewActivityCompleted() {
      sinon.assert.called(ActivityHandler._onNewActivity);
      return ActivityHandler._onNewActivity.lastCall.returnValue;
    }

    var threadDeferred;

    setup(function() {
      numberActivityData = {
        number: '123',
        body: 'foo'
      };

      emailActivityData = {
        target: 'abc@exmple.com',
        body: 'foo'
      };

      // configure findThreadFromNumber
      threadDeferred = Utils.Promise.defer();
      this.sinon.stub(MessageManager, 'findThreadFromNumber').returns(
        threadDeferred.promise
      );
      this.sinon.spy(Threads, 'registerMessage');
      this.sinon.spy(Navigation, 'toPanel');
      this.sinon.spy(Drafts, 'add');
      this.sinon.spy(Drafts, 'store');
      this.sinon.spy(Drafts, 'request');
      this.sinon.spy(ActivityHandler, '_onNewActivity');

      ActivityShim.hasPendingRequest.returns(true);
      ActivityHandler.init();
    });

    test('Should move to the composer and set activity', function(done) {
      ActivityClient.on.withArgs('new-activity-request').yield(
        numberActivityData
      );
      threadDeferred.reject(new Error('No thread for this test'));

      onceNewActivityCompleted().then(function() {
        sinon.assert.calledWithMatch(Drafts.add, {
          recipients: ['123'],
          type: 'sms',
          content: ['foo']
        });
        sinon.assert.called(Drafts.store);
        sinon.assert.callOrder(Drafts.request, Drafts.add, Drafts.store);
        sinon.assert.calledWith(
          Navigation.toPanel,
          'composer', { draftId: 'draftId', focusComposer: true }
        );
      }).then(done,done);
    });

    test('new message with body only', function(done) {
      ActivityClient.on.withArgs('new-activity-request').yield(
        { body: 'foo' }
      );

      onceNewActivityCompleted().then(() => {
        sinon.assert.notCalled(MessageManager.findThreadFromNumber);

        sinon.assert.calledWithMatch(Drafts.add, {
          recipients: null,
          type: 'sms',
          content: ['foo']
        });
        sinon.assert.called(Drafts.store);
        sinon.assert.callOrder(Drafts.request, Drafts.add, Drafts.store);
        sinon.assert.calledWith(
          Navigation.toPanel,
          'composer', { draftId: 'draftId', focusComposer: sinon.match.falsy }
        );
      }).then(done,done);
    });

    test('new message with email', function(done) {
      ActivityClient.on.withArgs('new-activity-request').yield(
        emailActivityData
      );

      threadDeferred.reject(new Error('No thread for this test'));

      onceNewActivityCompleted().then(function() {
        sinon.assert.calledWithMatch(Drafts.add, {
          recipients: [emailActivityData.target],
          type: 'mms',
          content: [emailActivityData.body]
        });
        sinon.assert.called(Drafts.store);
        sinon.assert.callOrder(Drafts.request, Drafts.add, Drafts.store);
        sinon.assert.calledWith(
          Navigation.toPanel,
          'composer', { draftId: 'draftId', focusComposer: true }
        );
      }).then(done,done);
    });

    test('when there is an existing thread, should navigate to the thread',
    function(done) {
      ActivityClient.on.withArgs('new-activity-request').yield(
        numberActivityData
      );

      // this time we found a thread
      threadDeferred.resolve(42);

      onceNewActivityCompleted().then(function() {
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
      this.sinon.stub(ConversationView, 'cleanFields');
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
          sinon.assert.notCalled(ConversationView.cleanFields);
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
          sinon.assert.called(ConversationView.cleanFields);
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
  });
});
