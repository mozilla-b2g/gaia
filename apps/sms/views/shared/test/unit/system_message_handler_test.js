/*global Contacts,
         MessageManager,
         MockContact,
         MocksHelper,
         MockMessages,
         Navigation,
         NotificationHelper,
         Notify,
         Settings,
         SilentSms,
         SMIL,
         SystemMessageHandler,
         Utils
*/

'use strict';

require('/shared/test/unit/mocks/mock_notification_helper.js');

require('/views/shared/test/unit/mock_contact.js');
require('/views/shared/test/unit/mock_contacts.js');
require('/views/shared/test/unit/mock_messages.js');
require('/services/test/unit/mock_message_manager.js');
require('/views/shared/test/unit/mock_settings.js');
require('/views/shared/test/unit/mock_notify.js');
require('/views/shared/test/unit/mock_navigation.js');
require('/views/shared/test/unit/mock_silent_sms.js');
require('/views/shared/test/unit/mock_smil.js');

require('/views/shared/js/utils.js');
require('/views/shared/test/unit/mock_utils.js');

require('/views/shared/js/system_message_handler.js');

var mocksHelperForActivityHandler = new MocksHelper([
  'Contacts',
  'MessageManager',
  'Navigation',
  'NotificationHelper',
  'Notify',
  'Settings',
  'SilentSms',
  'SMIL',
  'Utils'
]).init();

suite('SystemMessageHandler', function() {
  mocksHelperForActivityHandler.attachTestHelpers();

  var isDocumentHidden;

  var navigatorMocks = new Map([
    ['mozSetMessageHandler', () => {}],
    ['requestWakeLock', () => {}],
    ['mozApps', { launch() {} }]
  ]);

  suiteSetup(function() {
    navigatorMocks.forEach((mock, key) => {
      if (!(key in navigator)) {
        navigator[key] = mock;
      }
    });

    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: function() {
        return isDocumentHidden;
      }
    });
  });

  suiteTeardown(function() {
    delete document.hidden;
  });

  setup(function() {
    this.sinon.stub(Utils, 'alert').returns(Promise.resolve());

    isDocumentHidden = false;
    this.sinon.stub(document, 'addEventListener');

    SystemMessageHandler.init();
  });

  test('init()', function() {
    this.sinon.stub(navigator, 'mozSetMessageHandler');

    SystemMessageHandler.init();

    sinon.assert.calledTwice(window.navigator.mozSetMessageHandler);
    sinon.assert.calledWith(
      window.navigator.mozSetMessageHandler, 'sms-received'
    );
    sinon.assert.calledWith(
      window.navigator.mozSetMessageHandler, 'notification'
    );
  });

  suite('sms-received system message', function() {
    var appStub, wakeLockStub, notificationStub;

    function assertWakeLockIsRequested() {
      sinon.assert.calledOnce(navigator.requestWakeLock);
      sinon.assert.calledWith(navigator.requestWakeLock, 'cpu');

      // We shouldn't release wake lock until we completely handled new message.
      sinon.assert.notCalled(wakeLockStub.unlock);
    }

    function assertWakeLockIsReleased() {
      sinon.assert.calledOnce(wakeLockStub.unlock);
    }

    function assertUserIsNotified() {
      sinon.assert.calledOnce(Notify.ringtone);
      sinon.assert.calledOnce(Notify.vibrate);
    }

    function assertUserIsNotNotified() {
      sinon.assert.notCalled(Notify.ringtone);
      sinon.assert.notCalled(Notify.vibrate);
    }

    setup(function() {
      appStub = sinon.stub({ launch() {} });

      wakeLockStub = sinon.stub({
        unlock: () => {}
      });

      notificationStub = sinon.stub({
        addEventListener() {},
        close() {}
      });

      this.sinon.stub(navigator.mozApps, 'getSelf').returns(
        Promise.resolve(appStub)
      );
      this.sinon.stub(navigator, 'requestWakeLock').returns(wakeLockStub);
      this.sinon.spy(Notify, 'ringtone');
      this.sinon.spy(Notify, 'vibrate');
      this.sinon.stub(SilentSms, 'checkSilentModeFor').returns(
        Promise.resolve(false)
      );
      this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);
      this.sinon.stub(Navigation, 'toPanel').returns(Promise.resolve());
      this.sinon.stub(NotificationHelper, 'send').returns(notificationStub);

      this.sinon.stub(NotificationHelper, 'getIconURI').returns(null);
      NotificationHelper.getIconURI.withArgs(appStub).returns('iconURI');

      this.sinon.stub(Contacts, 'findByAddress').returns(
        Promise.resolve([])
      );
    });

    suite('received message from silenced number', function() {
      setup(function() {
        SilentSms.checkSilentModeFor.returns(Promise.resolve(true));
      });

      test('does not notify user in any way', function(done) {
        var handlingPromise = SystemMessageHandler.onSmsReceivedSystemMessage(
          MockMessages.sms()
        );

        assertWakeLockIsRequested();

        handlingPromise.then(() => {
          assertUserIsNotNotified();
          assertWakeLockIsReleased();

          sinon.assert.notCalled(NotificationHelper.send);
        }).then(done, done);
      });
    });

    suite('received class-0 message', function() {
      setup(function() {
        this.sinon.stub(MessageManager, 'deleteMessages').returns(
          Promise.resolve()
        );
      });

      test('with non-empty content', function(done) {
        var handlingPromise = SystemMessageHandler.onSmsReceivedSystemMessage(
          MockMessages.sms({ messageClass: 'class-0' })
        );

        assertWakeLockIsRequested();

        handlingPromise.then(() => {
          sinon.assert.calledOnce(appStub.launch);

          assertUserIsNotified();

          sinon.assert.calledWith(
            Utils.alert, { raw: 'body' }, { raw: 'sender' }
          );

          sinon.assert.notCalled(NotificationHelper.send);

          assertWakeLockIsReleased();
        }).then(done, done);
      });

      test('with empty content', function(done) {
        var handlingPromise = SystemMessageHandler.onSmsReceivedSystemMessage(
          MockMessages.sms({ body: null, messageClass: 'class-0' })
        );

        assertWakeLockIsRequested();

        handlingPromise.then(() => {
          sinon.assert.calledOnce(appStub.launch);

          assertUserIsNotified();

          sinon.assert.calledWith(
            Utils.alert, { raw: '' }, { raw: 'sender' }
          );

          sinon.assert.notCalled(NotificationHelper.send);

          assertWakeLockIsReleased();
        }).then(done, done);
      });
    });

    suite('received class-x message', function() {
      var smsMessage, mmsMessage;

      setup(function() {
        smsMessage = MockMessages.sms();
        mmsMessage = MockMessages.mms();
      });

      test('when app is visible and same conversation is opened',
      function(done) {
        Navigation.isCurrentPanel.withArgs(
          'thread', { id: smsMessage.threadId }
        ).returns(true);

        var handlingPromise = SystemMessageHandler.onSmsReceivedSystemMessage(
          smsMessage
        );

        assertWakeLockIsRequested();

        handlingPromise.then(() => {
          assertUserIsNotified();

          sinon.assert.notCalled(NotificationHelper.send);

          assertWakeLockIsReleased();
        }).then(done, done);
      });

      test('when app is hidden and same conversation is opened',
      function(done) {
        isDocumentHidden = true;

        Navigation.isCurrentPanel.withArgs(
          'thread', { id: smsMessage.threadId }
        ).returns(true);

        var handlingPromise = SystemMessageHandler.onSmsReceivedSystemMessage(
          smsMessage
        );

        assertWakeLockIsRequested();

        handlingPromise.then(() => {
          assertUserIsNotNotified();

          sinon.assert.calledWith(
            NotificationHelper.send,
            { raw: smsMessage.sender },
            {
              icon: 'iconURI',
              bodyL10n: { raw: smsMessage.body },
              tag: 'threadId:' + smsMessage.threadId,
              data: { id: smsMessage.id, threadId: smsMessage.threadId },
              closeOnClick: false
            }
          );

          assertWakeLockIsReleased();

          // Notification should not be closed until document is visible;
          sinon.assert.notCalled(notificationStub.close);

          isDocumentHidden = false;
          document.addEventListener.withArgs('visibilitychange').yield();
        }).then(() => {
          sinon.assert.calledOnce(notificationStub.close);
        }).then(done, done);
      });

      suite('received SMS', function() {
        test('Use sender as notification title if there is no contact',
        function(done) {
          var handlingPromise = SystemMessageHandler.onSmsReceivedSystemMessage(
            smsMessage
          );

          assertWakeLockIsRequested();

          handlingPromise.then(() => {
            assertUserIsNotNotified();

            sinon.assert.calledWith(
              NotificationHelper.send,
              { raw: smsMessage.sender },
              {
                icon: 'iconURI',
                bodyL10n: { raw: smsMessage.body },
                tag: 'threadId:' + smsMessage.threadId,
                data: { id: smsMessage.id, threadId: smsMessage.threadId },
                closeOnClick: false
              }
            );

            assertWakeLockIsReleased();
          }).then(done, done);
        });

        test('Use sender as notification title if contact does not have name',
        function(done) {
          var contactWithoutName = new MockContact();
          contactWithoutName.name = [];

          Contacts.findByAddress.withArgs(smsMessage.sender).returns(
            Promise.resolve([contactWithoutName])
          );

          SystemMessageHandler.onSmsReceivedSystemMessage(smsMessage).then(
            () => {
              assertUserIsNotNotified();

              sinon.assert.calledWith(
                NotificationHelper.send,
                { raw: smsMessage.sender },
                {
                  icon: 'iconURI',
                  bodyL10n: { raw: smsMessage.body },
                  tag: 'threadId:' + smsMessage.threadId,
                  data: { id: smsMessage.id, threadId: smsMessage.threadId },
                  closeOnClick: false
                }
              );
            }
          ).then(done, done);
        });

        test('Use contact name as notification title if there is a contact',
        function(done) {
          Contacts.findByAddress.withArgs(smsMessage.sender).returns(
            Promise.resolve(MockContact.list())
          );

          SystemMessageHandler.onSmsReceivedSystemMessage(smsMessage).then(
            () => {
              assertUserIsNotNotified();

              sinon.assert.calledWith(
                NotificationHelper.send,
                { raw: 'Pepito O\'Hare' },
                {
                  icon: 'iconURI',
                  bodyL10n: { raw: smsMessage.body },
                  tag: 'threadId:' + smsMessage.threadId,
                  data: { id: smsMessage.id, threadId: smsMessage.threadId },
                  closeOnClick: false
                }
              );
            }
          ).then(done, done);
        });

        test('Use empty string as notification body if message lacks one',
        function(done) {
          smsMessage.body = null;

          SystemMessageHandler.onSmsReceivedSystemMessage(smsMessage).then(
            () => {
              assertUserIsNotNotified();

              sinon.assert.calledWith(
                NotificationHelper.send,
                { raw: smsMessage.sender },
                {
                  icon: 'iconURI',
                  bodyL10n: { raw: '' },
                  tag: 'threadId:' + smsMessage.threadId,
                  data: { id: smsMessage.id, threadId: smsMessage.threadId },
                  closeOnClick: false
                }
              );
            }
          ).then(done, done);
        });
      });

      suite('received MMS', function() {
        test('if message pending on server', function(done) {
          mmsMessage.deliveryInfo[0].deliveryStatus = 'pending';

          var handlingPromise = SystemMessageHandler.onSmsReceivedSystemMessage(
            mmsMessage
          );

          assertWakeLockIsRequested();

          handlingPromise.then(() => {
            assertUserIsNotNotified();

            sinon.assert.notCalled(NotificationHelper.send);

            assertWakeLockIsReleased();
          }).then(done, done);
        });

        test('if message should be manually downloaded', function(done) {
          mmsMessage.deliveryInfo[0].deliveryStatus = 'manual';

          var handlingPromise = SystemMessageHandler.onSmsReceivedSystemMessage(
            mmsMessage
          );

          assertWakeLockIsRequested();

          handlingPromise.then(() => {
            assertUserIsNotNotified();

            sinon.assert.calledWith(
              NotificationHelper.send,
              { raw: mmsMessage.sender },
              {
                icon: 'iconURI',
                bodyL10n: 'notDownloaded-title',
                tag: 'threadId:' + mmsMessage.threadId,
                data: { id: mmsMessage.id, threadId: mmsMessage.threadId },
                closeOnClick: false
              }
            );

            assertWakeLockIsReleased();
          }).then(done, done);
        });

        test('if message has subject', function(done) {
          mmsMessage.subject = 'message-subject';

          SystemMessageHandler.onSmsReceivedSystemMessage(mmsMessage).then(
            () => {
              assertUserIsNotNotified();

              sinon.assert.calledWith(
                NotificationHelper.send,
                { raw: mmsMessage.sender },
                {
                  icon: 'iconURI',
                  bodyL10n: { raw: 'message-subject' },
                  tag: 'threadId:' + mmsMessage.threadId,
                  data: { id: mmsMessage.id, threadId: mmsMessage.threadId },
                  closeOnClick: false
                }
              );
            }
          ).then(done, done);
        });

        test('if message does not have subject, but has text slide',
        function(done) {
          this.sinon.stub(SMIL, 'parse').withArgs(mmsMessage).returns(
            Promise.resolve([{ text: 'some text' }])
          );

          SystemMessageHandler.onSmsReceivedSystemMessage(mmsMessage).then(
            () => {
              assertUserIsNotNotified();

              sinon.assert.calledWith(
                NotificationHelper.send,
                { raw: mmsMessage.sender },
                {
                  icon: 'iconURI',
                  bodyL10n: { raw: 'some text' },
                  tag: 'threadId:' + mmsMessage.threadId,
                  data: { id: mmsMessage.id, threadId: mmsMessage.threadId },
                  closeOnClick: false
                }
              );
            }
          ).then(done, done);
        });

        test('if message does not have subject, nor text slide',
        function(done) {
          SystemMessageHandler.onSmsReceivedSystemMessage(mmsMessage).then(
            () => {
              assertUserIsNotNotified();

              sinon.assert.calledWith(
                NotificationHelper.send,
                { raw: mmsMessage.sender },
                {
                  icon: 'iconURI',
                  bodyL10n: 'mms-message',
                  tag: 'threadId:' + mmsMessage.threadId,
                  data: { id: mmsMessage.id, threadId: mmsMessage.threadId },
                  closeOnClick: false
                }
              );
            }
          ).then(done, done);
        });
      });

      suite('handling notification click', function() {
        var notificationClickHandler;

        setup(function(done) {
          this.sinon.stub(MessageManager, 'getMessage').withArgs(
            smsMessage.id
          ).returns(Promise.resolve(smsMessage));

          SystemMessageHandler.onSmsReceivedSystemMessage(smsMessage).then(
            () => {
              // We don't want to use "yield" here because we'd like to have
              // promise-based result of yielded function.
              notificationClickHandler = notificationStub.addEventListener.
                withArgs('click').lastCall.args[1];
            }
          ).then(done, done);
        });

        test('if appropriate conversation is already opened', function(done) {
          Navigation.isCurrentPanel.withArgs(
            'thread', { id: smsMessage.threadId }
          ).returns(true);

          notificationClickHandler().then(() => {
            sinon.assert.called(appStub.launch);

            sinon.assert.notCalled(Navigation.toPanel);
          }).then(done, done);
        });

        test('if appropriate conversation is not opened', function(done) {
          notificationClickHandler().then(() => {
            sinon.assert.called(appStub.launch);

            sinon.assert.calledWith(
              Navigation.toPanel, 'thread', { id: smsMessage.threadId }
            );
          }).then(done, done);
        });

        test('if message has been deleted', function(done) {
          MessageManager.getMessage.withArgs(smsMessage.id).returns(
            Promise.reject('deleted')
          );

          notificationClickHandler().then(() => {
            sinon.assert.called(appStub.launch);
            sinon.assert.calledWith(Utils.alert, 'deleted-sms');

            sinon.assert.notCalled(Navigation.toPanel);
          }).then(done, done);
        });
      });

      suite('dual SIM behavior', function() {
        setup(function() {
          smsMessage.iccId = '200';

          this.sinon.stub(Settings, 'hasSeveralSim').returns(true);
          this.sinon.stub(Utils, 'getSimNameByIccId').withArgs('200').returns(
            Promise.resolve('SIM 2')
          );
        });

        test('message has iccId, but only one SIM is presented',
        function(done) {
          Settings.hasSeveralSim.returns(false);

          SystemMessageHandler.onSmsReceivedSystemMessage(smsMessage).then(
            () => {
              sinon.assert.calledWith(
                NotificationHelper.send,
                { raw: smsMessage.sender },
                {
                  icon: 'iconURI',
                  bodyL10n: { raw: smsMessage.body },
                  tag: 'threadId:' + smsMessage.threadId,
                  data: { id: smsMessage.id, threadId: smsMessage.threadId },
                  closeOnClick: false
                }
              );
            }
          ).then(done, done);
        });

        test('message iccId is unknown and several SIMs are presented',
        function(done) {
          smsMessage.iccId = null;

          SystemMessageHandler.onSmsReceivedSystemMessage(smsMessage).then(
            () => {
              sinon.assert.calledWith(
                NotificationHelper.send,
                { raw: smsMessage.sender },
                {
                  icon: 'iconURI',
                  bodyL10n: { raw: smsMessage.body },
                  tag: 'threadId:' + smsMessage.threadId,
                  data: { id: smsMessage.id, threadId: smsMessage.threadId },
                  closeOnClick: false
                }
              );
            }
          ).then(done, done);
        });

        test('message has iccId and several SIMs are presented',
        function(done) {
          SystemMessageHandler.onSmsReceivedSystemMessage(smsMessage).then(
            () => {
              sinon.assert.calledWith(
                NotificationHelper.send,
                {
                  id: 'dsds-notification-title-with-sim',
                  args: { sim: 'SIM 2', sender: smsMessage.sender }
                },
                {
                  icon: 'iconURI',
                  bodyL10n: { raw: smsMessage.body },
                  tag: 'threadId:' + smsMessage.threadId,
                  data: { id: smsMessage.id, threadId: smsMessage.threadId },
                  closeOnClick: false
                }
              );
            }
          ).then(done, done);
        });

        test('message from contact with iccId and several SIMs are presented',
        function(done) {
          Contacts.findByAddress.withArgs(smsMessage.sender).returns(
            Promise.resolve(MockContact.list())
          );

          SystemMessageHandler.onSmsReceivedSystemMessage(smsMessage).then(
            () => {
              sinon.assert.calledWith(
                NotificationHelper.send,
                {
                  id: 'dsds-notification-title-with-sim',
                  args: { sim: 'SIM 2', sender: 'Pepito O\'Hare' }
                },
                {
                  icon: 'iconURI',
                  bodyL10n: { raw: smsMessage.body },
                  tag: 'threadId:' + smsMessage.threadId,
                  data: { id: smsMessage.id, threadId: smsMessage.threadId },
                  closeOnClick: false
                }
              );
            }
          ).then(done, done);
        });
      });
    });
  });

  suite('notification system message', function() {
    var appStub, smsMessage;

    setup(function() {
      smsMessage = MockMessages.sms();
      appStub = sinon.stub({ launch() {} });

      this.sinon.stub(navigator.mozApps, 'getSelf').returns(
        Promise.resolve(appStub)
      );

      this.sinon.stub(Navigation, 'init');
      this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);
      this.sinon.stub(Navigation, 'toPanel').returns(Promise.resolve());
      this.sinon.stub(Navigation, 'hasPendingInit').returns(false);

      this.sinon.stub(MessageManager, 'getMessage').withArgs(
        smsMessage.id
      ).returns(Promise.resolve(smsMessage));
    });

    test('nothing is done when notification is removed', function(done) {
      SystemMessageHandler.onNotificationSystemMessage({
        // When notification is removed "clicked" property is "false".
        clicked: false,
        data: { id: smsMessage.id, threadId: smsMessage.threadId }
      }).then(() => {
        sinon.assert.notCalled(appStub.launch);

        sinon.assert.notCalled(Navigation.toPanel);
      }).then(done, done);
    });

    test('close the app when notification is removed with pending navigation',
      function(done) {

      Navigation.hasPendingInit.returns(true);
      this.sinon.stub(window, 'close');

      SystemMessageHandler.onNotificationSystemMessage({
        // When notification is removed "clicked" property is "false".
        clicked: false,
        data: { id: smsMessage.id, threadId: smsMessage.threadId }
      }).then(
        () => new Error('Should not enter resolved case'),
        (error) => {
          sinon.assert.called(window.close);
          assert.equal(error.message, 'Notification has been dismissed.');
        }
      ).then(done, done);
    });

    test('if appropriate conversation is already opened', function(done) {
      Navigation.isCurrentPanel.withArgs(
        'thread', { id: smsMessage.threadId }
      ).returns(true);

      SystemMessageHandler.onNotificationSystemMessage({
        clicked: true,
        data: { id: smsMessage.id, threadId: smsMessage.threadId }
      }).then(() => {
        sinon.assert.called(appStub.launch);

        sinon.assert.notCalled(Navigation.toPanel);
      }).then(done, done);
    });

    test('if appropriate conversation is not opened', function(done) {
      SystemMessageHandler.onNotificationSystemMessage({
        clicked: true,
        data: { id: smsMessage.id, threadId: smsMessage.threadId }
      }).then(() => {
        sinon.assert.called(appStub.launch);

        sinon.assert.calledWith(
          Navigation.toPanel, 'thread', { id: smsMessage.threadId }
        );
      }).then(done, done);
    });

    test('if message has been deleted', function(done) {
      MessageManager.getMessage.withArgs(smsMessage.id).returns(
        Promise.reject('deleted')
      );

      SystemMessageHandler.onNotificationSystemMessage({
        clicked: true,
        data: { id: smsMessage.id, threadId: smsMessage.threadId }
      }).then(() => {
        sinon.assert.called(appStub.launch);
        sinon.assert.calledWith(Utils.alert, 'deleted-sms');

        sinon.assert.notCalled(Navigation.toPanel);
      }).then(done, done);
    });

    test('if message has been deleted with pending navigation', function(done) {
      MessageManager.getMessage.withArgs(smsMessage.id).returns(
        Promise.reject('deleted')
      );

      Navigation.hasPendingInit.returns(true);

      SystemMessageHandler.onNotificationSystemMessage({
        clicked: true,
        data: { id: smsMessage.id, threadId: smsMessage.threadId }
      }).then(() => {
        sinon.assert.called(appStub.launch);
        sinon.assert.calledWith(Utils.alert, 'deleted-sms');

        sinon.assert.notCalled(Navigation.toPanel);
        sinon.assert.called(Navigation.init);
      }).then(done, done);
    });
  });
});
