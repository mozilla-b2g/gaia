/*global MocksHelper, MockNavigatormozMobileMessage, MessageManager, ThreadUI,
         MockL10n, MockContact, loadBodyHTML, MozSmsFilter,
         ThreadListUI, MockThreads, MockMessages, Threads, Compose, Settings,
         GroupView, ReportView, ThreadListUI, MockMessages, Compose, SMIL,
         Drafts, Draft, Utils
*/

'use strict';

requireApp('sms/js/utils.js');
requireApp('sms/js/time_headers.js');

requireApp('sms/test/unit/mock_attachment.js');
require('/shared/test/unit/mocks/mock_async_storage.js');
requireApp('sms/test/unit/mock_compose.js');
requireApp('sms/test/unit/mock_contact.js');
requireApp('sms/test/unit/mock_contacts.js');
requireApp('sms/test/unit/mock_drafts.js');
requireApp('sms/test/unit/mock_link_action_handler.js');
requireApp('sms/test/unit/mock_l10n.js');
requireApp('sms/test/unit/mock_information.js');
requireApp('sms/test/unit/mock_messages.js');
requireApp('sms/test/unit/mock_moz_sms_filter.js');
requireApp('sms/test/unit/mock_navigatormoz_sms.js');
requireApp('sms/test/unit/mock_recipients.js');
require('/test/unit/mock_settings.js');
requireApp('sms/test/unit/mock_smil.js');
requireApp('sms/test/unit/mock_thread_ui.js');
requireApp('sms/test/unit/mock_thread_list_ui.js');
requireApp('sms/test/unit/mock_threads.js');
requireApp('sms/test/unit/utils_mockup.js');
requireApp('sms/test/unit/mock_utils.js');

requireApp('sms/js/message_manager.js');

var mocksHelperForMessageManager = new MocksHelper([
  'Attachment',
  'asyncStorage',
  'Compose',
  'Contacts',
  'Draft',
  'Drafts',
  'MozSmsFilter',
  'GroupView',
  'ReportView',
  'Recipients',
  'Settings',
  'SMIL',
  'ThreadListUI',
  'ThreadUI',
  'Threads',
  'Utils'
]);

mocksHelperForMessageManager.init();

suite('message_manager.js >', function() {

  var mocksHelper = mocksHelperForMessageManager;
  var realMozMobileMessage;

  suiteSetup(function() {
    mocksHelper.suiteSetup();
    realMozMobileMessage = MessageManager._mozMobileMessage;
    MessageManager._mozMobileMessage = MockNavigatormozMobileMessage;
  });

  suiteTeardown(function() {
    mocksHelper.suiteTeardown();
    MessageManager._mozMobileMessage = realMozMobileMessage;
  });

  setup(function() {
    this.sinon.spy(MockNavigatormozMobileMessage, 'send');
    this.sinon.spy(MockNavigatormozMobileMessage, 'sendMMS');
  });


  suite('on message sent > ', function() {
    setup(function() {
      this.sinon.spy(ThreadUI, 'onMessageSending');
      this.sinon.stub(Threads, 'registerMessage');
    });

    test('ThreadUI is always notified', function() {
        var sms = MockMessages.sms();

        Threads.currentId = sms.threadId;
        MessageManager.onMessageSending({ message: sms });
        sinon.assert.called(ThreadUI.onMessageSending);

        ThreadUI.onMessageSending.reset();

        // ensure the threadId is different
        Threads.currentId = sms.threadId + 1;
        MessageManager.onMessageSending({ message: sms });
        sinon.assert.called(ThreadUI.onMessageSending);
      }
    );
  });

  suite('sendSMS() >', function() {
    test('send to one recipient successfully', function() {
      var smsOpts = {
        recipients: '123',
        content: 'hola',
        onsuccess: sinon.stub(),
        oncomplete: sinon.stub()
      };

      MessageManager.sendSMS(smsOpts);

      sinon.assert.calledWithExactly(
        MockNavigatormozMobileMessage.send,
        ['123'], 'hola', undefined
      );

      MockNavigatormozMobileMessage.mTriggerSmsOnSuccess();
      sinon.assert.calledOnce(smsOpts.onsuccess);
      sinon.assert.calledOnce(smsOpts.oncomplete);
    });

    test('send to two recipients successfully', function() {
      var smsOpts = {
        recipients: ['123', '456'],
        content: 'hola',
        onsuccess: sinon.stub(),
        oncomplete: sinon.stub()
      };

      MessageManager.sendSMS(smsOpts);

      sinon.assert.calledWithExactly(
        MockNavigatormozMobileMessage.send,
        ['123', '456'], 'hola', undefined
      );

      MockNavigatormozMobileMessage.mTriggerSmsOnSuccess();
      sinon.assert.calledTwice(smsOpts.onsuccess);
      sinon.assert.calledOnce(smsOpts.oncomplete);
    });

    test('send to one recipient unsuccessfully', function() {
      var smsOpts = {
        recipients: '123',
        content: 'hola',
        onerror: sinon.stub(),
        oncomplete: sinon.stub()
      };

      MessageManager.sendSMS(smsOpts);

      MockNavigatormozMobileMessage.mTriggerSmsOnError();
      sinon.assert.calledOnce(smsOpts.onerror);
      sinon.assert.calledOnce(smsOpts.oncomplete);
    });

    test('send to two recipients unsuccessfully', function() {
      var smsOpts = {
        recipients: ['123', '456'],
        content: 'hola',
        onerror: sinon.stub(),
        oncomplete: sinon.stub()
      };

      MessageManager.sendSMS(smsOpts);

      MockNavigatormozMobileMessage.mTriggerSmsOnError();
      sinon.assert.calledTwice(smsOpts.onerror);
      sinon.assert.calledOnce(smsOpts.oncomplete);
    });

    test('send with a serviceId in a dual SIM setup', function() {
      this.sinon.stub(Settings, 'hasSeveralSim').returns(true);
      var smsOpts = {
        recipients: '123',
        content: 'hola',
        serviceId: 0 // we use 0 because it's falsy, to test it still works
      };

      MessageManager.sendSMS(smsOpts);

      sinon.assert.calledWithExactly(
        MockNavigatormozMobileMessage.send,
        ['123'], 'hola', { serviceId: 0 }
      );
    });

    test('send with a serviceId in a non-dual SIM setup', function() {
      this.sinon.stub(Settings, 'hasSeveralSim').returns(false);
      var smsOpts = {
        recipients: '123',
        content: 'hola',
        serviceId: 1
      };

      MessageManager.sendSMS(smsOpts);

      sinon.assert.calledWithExactly(
        MockNavigatormozMobileMessage.send,
        ['123'], 'hola', undefined
      );
    });

    test('serviceId is a string containing a number', function() {
      this.sinon.stub(Settings, 'hasSeveralSim').returns(true);
      var smsOpts = {
        recipients: '123',
        content: 'hola',
        serviceId: '0'
      };

      MessageManager.sendSMS(smsOpts);

      sinon.assert.calledWithExactly(
        MockNavigatormozMobileMessage.send,
        ['123'], 'hola', { serviceId: 0 }
      );
    });

    test('serviceId is a bad string', function() {
      this.sinon.stub(Settings, 'hasSeveralSim').returns(true);
      var smsOpts = {
        recipients: '123',
        content: 'hola',
        serviceId: 'oirutoirutoitr'
      };

      MessageManager.sendSMS(smsOpts);

      sinon.assert.calledWithExactly(
        MockNavigatormozMobileMessage.send,
        ['123'], 'hola', undefined
      );
    });
  });

  suite('sendMMS() >', function() {
    setup(function() {
      this.sinon.spy(SMIL, 'generate');
    });

    test('send to one recipient successfully', function() {
      var mmsOpts = {
        recipients: '123',
        subject: null,
        content: 'hola',
        onsuccess: sinon.stub()
      };

      MessageManager.sendMMS(mmsOpts);
      var smil = SMIL.generate.firstCall.returnValue;

      sinon.assert.calledWithExactly(
        MockNavigatormozMobileMessage.sendMMS,
        {
          receivers: ['123'],
          subject: null,
          smil: smil.smil,
          attachments: smil.attachments
        }, /* send options */ undefined
      );

      MockNavigatormozMobileMessage.mTriggerMmsOnSuccess();
      sinon.assert.calledOnce(mmsOpts.onsuccess);
    });

    test('send to two recipients successfully', function() {
      var mmsOpts = {
        recipients: ['123', '456'],
        subject: null,
        content: 'hola',
        onsuccess: sinon.stub()
      };
      MessageManager.sendMMS(mmsOpts);

      MockNavigatormozMobileMessage.mTriggerMmsOnSuccess();
      sinon.assert.calledOnce(mmsOpts.onsuccess);
    });

    test('send to one recipient unsuccessfully', function() {
      var mmsOpts = {
        recipients: '123',
        subject: null,
        content: 'hola',
        onerror: sinon.stub()
      };

      MessageManager.sendMMS(mmsOpts);

      MockNavigatormozMobileMessage.mTriggerMmsOnError();

      sinon.assert.calledOnce(mmsOpts.onerror);
    });

    test('send to two recipients unsuccessfully', function() {
      var mmsOpts = {
        recipients: ['123', '456'],
        subject: null,
        content: 'hola',
        onerror: sinon.stub()
      };

      MessageManager.sendMMS(mmsOpts);

      MockNavigatormozMobileMessage.mTriggerMmsOnError();

      sinon.assert.calledOnce(mmsOpts.onerror);
    });

    suite('send with a serviceId', function() {
      var mmsOpts;

      setup(function() {
        this.sinon.stub(Settings, 'hasSeveralSim').returns(true);

        mmsOpts = {
          recipients: '123',
          subject: null,
          content: 'hola',
          // we use 0 to check that the code behaves correctly with falsy values
          serviceId: 0
        };
      });

      test('while the current serviceId is the same', function() {
        Settings.mmsServiceId = 0;

        MessageManager.sendMMS(mmsOpts);

        var smil = SMIL.generate.firstCall.returnValue;

        sinon.assert.calledWithExactly(
          MockNavigatormozMobileMessage.sendMMS,
          {
            receivers: ['123'],
            subject: null,
            smil: smil.smil,
            attachments: smil.attachments
          }, {
            serviceId: mmsOpts.serviceId
          }
        );
      });

      test('while the current serviceId is different', function() {
        Settings.mmsServiceId = 1;

        MessageManager.sendMMS(mmsOpts);

        var smil = SMIL.generate.firstCall.returnValue;

        sinon.assert.calledWithExactly(
          MockNavigatormozMobileMessage.sendMMS,
          {
            receivers: ['123'],
            subject: null,
            smil: smil.smil,
            attachments: smil.attachments
          }, {
            serviceId: mmsOpts.serviceId
          }
        );
      });

      test('on a non-dual sim setup with a different serviceId', function() {
        Settings.hasSeveralSim.returns(false);
        Settings.mmsServiceId = 1;

        MessageManager.sendMMS(mmsOpts);

        var smil = SMIL.generate.firstCall.returnValue;

        sinon.assert.calledWithExactly(
          MockNavigatormozMobileMessage.sendMMS,
          {
            receivers: ['123'],
            subject: null,
            smil: smil.smil,
            attachments: smil.attachments
          }, undefined);
      });

      test('serviceId is a string containing a number', function() {
        mmsOpts.serviceId = '0';
        Settings.mmsServiceId = 0;

        MessageManager.sendMMS(mmsOpts);

        sinon.assert.calledWith(
          MockNavigatormozMobileMessage.sendMMS,
          sinon.match.any, { serviceId: 0 }
        );
      });

      test('serviceId is a bad string', function() {
        mmsOpts.serviceId = 'hjuoriut';
        Settings.mmsServiceId = 0;

        MessageManager.sendMMS(mmsOpts);

        sinon.assert.calledWithExactly(
          MockNavigatormozMobileMessage.sendMMS,
          sinon.match.any, undefined
        );
      });
    });
  });

  suite('launchComposer() >', function() {

    suiteSetup(function() {
      MessageManager.threadMessages = document.createElement('div');
      MessageManager.mainWrapper = document.createElement('div');
    });

    suiteTeardown(function() {
      MessageManager.threadMessages = null;
      MessageManager.mainWrapper = null;
    });

    setup(function() {
      this.sinon.spy(ThreadUI, 'cleanFields');
      this.sinon.spy(ThreadUI.recipients, 'focus');
      ThreadUI.draft = null;
      MessageManager.launchComposer();
    });

    test(' all fields cleaned', function() {
      assert.ok(ThreadUI.cleanFields.calledWith(true));
    });

    test(' layout updated', function() {
      assert.ok(MessageManager.threadMessages.classList.contains('new'));
    });

    test(' slide & callback', function(done) {
      MessageManager.launchComposer(function() {
        done();
      });
    });

    suite('message drafts', function() {
      var nativeMozL10n;

      setup(function() {
        nativeMozL10n = navigator.mozL10n;
        navigator.mozL10n = MockL10n;
        ThreadUI.draft = new Draft({
          threadId: 1234,
          recipients: []
        });
        this.sinon.spy(Compose, 'fromDraft');
        this.sinon.stub(Drafts, 'delete').returns(Drafts);
        this.sinon.stub(Drafts, 'store').returns(Drafts);
        this.sinon.spy(ThreadUI.recipients, 'add');
        this.sinon.spy(ThreadUI, 'updateHeaderData');
      });

      teardown(function() {
        navigator.mozL10n = nativeMozL10n;
        nativeMozL10n = null;
        ThreadUI.draft = null;
      });

      test('Calls Compose.fromDraft()', function() {
        MessageManager.launchComposer();
        assert.ok(Compose.fromDraft.calledOnce);
      });

      test('No recipients loaded', function() {
        MessageManager.launchComposer();
        assert.isFalse(ThreadUI.recipients.add.called);
        assert.isFalse(ThreadUI.updateHeaderData.called);
      });

      test('with recipients', function() {
        ThreadUI.draft.recipients = ['800 732 0872', '800 555 1212'];
        MessageManager.launchComposer();
        assert.ok(ThreadUI.recipients.add.calledTwice);
        assert.isFalse(ThreadUI.updateHeaderData.called);
      });

      test('discards draft record', function() {
        ThreadUI.draft = {
          recipients: []
        };

        MessageManager.launchComposer();

        assert.isTrue(Drafts.delete.called);
        assert.isTrue(Drafts.store.called);
      });
    });
  });

  suite('handleActivity() >', function() {
    var nativeMozL10n = navigator.mozL10n;

    suiteSetup(function() {
      navigator.mozL10n = MockL10n;
      loadBodyHTML('/index.html');
      ThreadUI.initRecipients();
    });

    suiteTeardown(function() {
      navigator.mozL10n = nativeMozL10n;
    });

    setup(function() {
      ThreadUI.initRecipients();
      this.sinon.spy(Compose, 'fromDraft');
      this.sinon.spy(Compose, 'fromMessage');
      MessageManager.threadMessages = document.createElement('div');
    });

    teardown(function() {
      MessageManager.activity = null;
    });

    test('from activity with unknown contact', function() {
      var activity = {
        number: '998',
        contact: null
      };
      MessageManager.handleActivity(activity);

      assert.equal(ThreadUI.recipients.numbers.length, 1);
      assert.equal(ThreadUI.recipients.numbers[0], '998');
      assert.ok(Compose.fromMessage.calledWith(activity));
    });

    test('from activity with known contact', function() {
      var activity = {
        contact: new MockContact()
      };
      MessageManager.handleActivity(activity);

      assert.equal(ThreadUI.recipients.numbers.length, 1);
      assert.equal(ThreadUI.recipients.numbers[0], '+346578888888');
      assert.ok(Compose.fromMessage.calledWith(activity));
    });

    test('with message body', function() {
      var activity = {
        number: '998',
        contact: null,
        body: 'test'
      };
      MessageManager.handleActivity(activity);
      assert.ok(Compose.fromMessage.calledWith(activity));
    });

    test('No contact and no number', function() {
      var activity = {
        number: null,
        contact: null,
        body: 'Youtube url'
      };
      MessageManager.handleActivity(activity);
      assert.equal(ThreadUI.recipients.numbers.length, 0);
      assert.ok(Compose.fromMessage.calledWith(activity));
    });
  });

  suite('handleForward() >', function() {
    var message;
    setup(function() {
      this.sinon.spy(Compose, 'fromMessage');
      this.sinon.stub(MessageManager, 'getMessage', function(id) {
        switch (id) {
          case 1:
            message = MockMessages.sms();
            break;
          case 2:
            message = MockMessages.mms();
            break;
          case 3:
            message = MockMessages.mms({subject: 'Title'});
        }
        var request = {
          result: message,
          set onsuccess(cb) {
            cb();
          },
          get onsuccess() {
            return {};
          }
        };
        return request;
      });
    });

    teardown(function() {
      MessageManager.forward = null;
    });

    test(' forward SMS', function() {
      var forward = {
        messageId: 1
      };
      MessageManager.handleForward(forward);
      assert.ok(MessageManager.getMessage.calledOnce);
      assert.ok(MessageManager.getMessage.calledWith(1));
      assert.ok(Compose.fromMessage.called);
    });

    test(' forward MMS with attachment', function() {
      var forward = {
        messageId: 2
      };
      MessageManager.handleForward(forward);
      assert.ok(MessageManager.getMessage.calledOnce);
      assert.ok(MessageManager.getMessage.calledWith(2));
      assert.isTrue(Compose.fromMessage.calledWith(message));
    });

    test(' forward MMS with subject', function() {
      var forward = {
        messageId: 3
      };
      MessageManager.handleForward(forward);
      assert.ok(MessageManager.getMessage.calledOnce);
      assert.ok(MessageManager.getMessage.calledWith(3));
      assert.isTrue(Compose.fromMessage.calledWith(message));
    });
  });

  suite('getMessages() >', function() {
    var options;

    setup(function() {
      this.sinon.spy(MockNavigatormozMobileMessage, 'getMessages');

      var filter = new MozSmsFilter();
      filter.threadId = 1;

      options = {
        filter: filter,
        each: sinon.spy(function(message) {
          return !message.stopHere;
        }),
        end: sinon.stub(),
        done: sinon.stub()
      };

      MessageManager.getMessages(options);
    });

    test('rendering goes to the end', function() {
      var messagesList = [
        { id: 1 },
        { id: 2 },
        { id: 3 },
        { id: 4 }
      ];

      MockNavigatormozMobileMessage.mTriggerMessagesRequest(messagesList);

      assert.equal(options.each.callCount, 4);
      assert.ok(options.done.called);
      assert.ok(options.end.called);
      assert.ok(options.done.calledAfter(options.end));
    });

    test('rendering is interrupted', function() {
      var messagesList = [
        { id: 1 },
        { id: 2 },
        { id: 3, stopHere: true },
        { id: 4 }
      ];

      MockNavigatormozMobileMessage.mTriggerMessagesRequest(messagesList);

      assert.equal(options.each.callCount, 3);
      assert.ok(options.done.called);
      assert.isFalse(options.end.called);
    });
  });

  suite('markThreadRead()', function() {

    setup(function() {
      this.sinon.spy(MockNavigatormozMobileMessage, 'getMessages');
      this.sinon.spy(MockNavigatormozMobileMessage, 'markMessageRead');

      MessageManager.markThreadRead(1);
    });

    test('call mark read on the correct messages', function() {
      assert.ok(
        MockNavigatormozMobileMessage.getMessages.calledWithMatch({
          threadId: 1,
          read: false
        })
      );

      var messagesList = [
        { id: 1 },
        { id: 2 },
        { id: 3 },
        { id: 4 }
      ];

      MockNavigatormozMobileMessage.mTriggerMessagesRequest(messagesList);

      MockNavigatormozMobileMessage.mTriggerMarkReadSuccess();
      MockNavigatormozMobileMessage.mTriggerMarkReadSuccess();
      MockNavigatormozMobileMessage.mTriggerMarkReadSuccess();
      MockNavigatormozMobileMessage.mTriggerMarkReadSuccess();

      // doing one more to see if we're not called too many times
      MockNavigatormozMobileMessage.mTriggerMarkReadSuccess();
      assert.equal(MockNavigatormozMobileMessage.markMessageRead.callCount, 4);

      messagesList.forEach(function(message) {
        assert.ok(
          MockNavigatormozMobileMessage.markMessageRead.calledWith(
            message.id, true
          )
        );
      });
    });

  });

  suite('onHashChange', function() {
    setup(function() {
      this.sinon.spy(document.activeElement, 'blur');
      MessageManager.threadMessages = document.createElement('div');
      MessageManager.composerContainer = document.createElement('div');
      this.sinon.spy(ThreadUI, 'cancelEdit');
      this.sinon.spy(ThreadUI, 'renderMessages');
      this.sinon.spy(ThreadUI, 'cleanFields');
      this.sinon.stub(ThreadUI, 'updateHeaderData');
      this.sinon.spy(ThreadListUI, 'cancelEdit');
      this.sinon.spy(ThreadListUI, 'mark');
      this.sinon.spy(GroupView, 'reset');
      this.sinon.spy(ReportView, 'reset');
      this.sinon.spy(MessageManager, 'handleActivity');
      this.sinon.stub(MessageManager, 'slide');
      MessageManager.onHashChange();
    });

    teardown(function() {
      ThreadUI.draft = null;
      Threads.currentId = null;
      delete MessageManager.threadMessages;
    });

    suite('> Draft content for threaded messages', function() {
      setup(function() {
        // Reset state for slide and updateHeaderData
        // which we need to track
        MessageManager.slide.reset();
        ThreadUI.updateHeaderData.reset();
        ThreadUI.inThread = false;
        ThreadUI.draft = new Draft({
          content: ['i am a draft'],
          threadId: 1234
        });
        this.threadId = Threads.currentId = 1234;
        window.location.hash = '#thread=' + this.threadId;
        this.sinon.spy(Compose, 'fromDraft');
        MessageManager.onHashChange();
      });
      teardown(function() {
        ThreadUI.draft = null;
        Threads.currentId = null;
      });

      test('Thread latest draft rendered after clearing composer', function() {
        var draft = {};
        this.sinon.stub(Threads, 'get').returns({
          hasDrafts: true,
          drafts: {
            latest: draft
          }
        });
        ThreadUI.draft = null;

        ThreadUI.updateHeaderData.yield();
        MessageManager.slide.yield();

        sinon.assert.callOrder(ThreadUI.renderMessages, Compose.fromDraft);
        sinon.assert.calledWith(Compose.fromDraft, draft);
        assert.equal(draft, ThreadUI.draft);
        assert.isFalse(ThreadUI.draft.isEdited);
      });

      test('Thread latest draft rendered if not in thread', function() {
        var draft = {
          content: 'AAA'
        };
        this.sinon.stub(Threads, 'get').returns({
          hasDrafts: true,
          drafts: {
            latest: draft
          }
        });

        ThreadUI.updateHeaderData.yield();
        MessageManager.slide.yield();

        sinon.assert.callOrder(ThreadUI.renderMessages, Compose.fromDraft);
        sinon.assert.calledWith(Compose.fromDraft, draft);
        assert.equal(draft, ThreadUI.draft);
        assert.isFalse(ThreadUI.draft.isEdited);
      });

      test('Thread latest draft not rendered if in thread', function() {
        ThreadUI.inThread = true;
        var draft = {
          content: 'AAA'
        };
        this.sinon.stub(Threads, 'get').returns({
          hasDrafts: true,
          drafts: {
            latest: draft
          }
        });

        ThreadUI.updateHeaderData.yield();
        MessageManager.slide.yield();

        sinon.assert.notCalled(Compose.fromDraft);
        sinon.assert.neverCalledWith(Compose.fromDraft, draft);
      });
    });

    test('Remove any focus left on specific elements ', function() {
      assert.ok(document.activeElement.blur.called);
    });

    test('Exit edit mode (Thread or Message) ', function() {
      assert.ok(ThreadUI.cancelEdit.called);
      assert.ok(ThreadListUI.cancelEdit.called);
    });

    test('Reset Group Participants/Report View ', function() {
      assert.ok(GroupView.reset.called);
      assert.ok(ReportView.reset.called);
    });

    suite('> Switch to #new', function() {
      setup(function() {
        this.activity = MessageManager.activity = { test: true };
        MessageManager.handleActivity();
        ThreadUI.inThread = true; // to test this is reset correctly
        this.sinon.spy(ThreadUI.recipients, 'focus');
        window.location.hash = '#new';
        MessageManager.onHashChange();
      });

      teardown(function() {
        MessageManager.activity = null;
      });

      test('called handleActivity with activity', function() {
        assert.ok(MessageManager.handleActivity.calledOnce);
      });

      test('focus after show "composer"', function(done) {
        this.sinon.stub(MessageManager, 'launchComposer', function(cb) {
          cb && cb();
          assert.ok(ThreadUI.recipients.focus.called);
          done();
        });
        MessageManager.onHashChange();
      });

      suite('> Switch to #thread=100', function() {
        setup(function() {
          // reset states
          MessageManager.threadMessages.classList.add('new');
          MessageManager.slide.reset();
          ThreadUI.updateHeaderData.reset();

          this.sinon.spy(Utils, 'closeNotificationsForThread');
          this.threadId = MockThreads.currentId = 100;
          window.location.hash = '#thread=' + this.threadId;
          MessageManager.onHashChange();
        });
        teardown(function() {
          MockThreads.currentId = null;
        });
        test('removes "new" class from messages', function() {
          assert.isFalse(
            MessageManager.threadMessages.classList.contains('new')
          );
        });
        test('calls ThreadListUI.mark', function() {
          assert.ok(
            ThreadListUI.mark.calledWith(this.threadId, 'read')
          );
        });
        test('calls closeNotificationsForThread', function() {
          sinon.assert.called(Utils.closeNotificationsForThread);
        });
        test('calls updateHeaderData', function() {
          assert.ok(
            ThreadUI.updateHeaderData.called
          );
        });

        suite('> header data updated', function() {
          setup(function() {
            ThreadUI.updateHeaderData.yield();
          });
          test('does not call MessageManager.slide', function() {
            assert.isFalse(
              MessageManager.slide.called
            );
          });
          test('sets ThreadUI.inThread', function() {
            assert.isTrue(
              ThreadUI.inThread
            );
          });
          test('calls ThreadUI.renderMessages', function() {
            assert.ok(ThreadUI.renderMessages.called);
            assert.equal(
              ThreadUI.renderMessages.args[0][0], this.threadId
            );
          });
        });
      });
    });

    suite('> Switch to #thread=100', function() {
      setup(function() {
        // reset states
        MessageManager.threadMessages.classList.remove('new');
        MessageManager.slide.reset();
        ThreadUI.updateHeaderData.reset();
        ThreadUI.inThread = false;

        this.threadId = MockThreads.currentId = 100;
        window.location.hash = '#thread=' + this.threadId;
        MessageManager.onHashChange();
      });
      teardown(function() {
        MockThreads.currentId = null;
      });
      test('calls ThreadListUI.mark', function() {
        assert.ok(
          ThreadListUI.mark.calledWith(this.threadId, 'read')
        );
      });
      test('calls updateHeaderData', function() {
        assert.ok(
          ThreadUI.updateHeaderData.called
        );
      });

      suite('> header data updated', function() {
        setup(function() {
          ThreadUI.updateHeaderData.yield();
        });
        test('calls MessageManager.slide', function() {
          assert.ok(
            MessageManager.slide.called
          );
        });

        suite('> slide completed', function() {
          setup(function() {
            MessageManager.slide.yield();
          });
          test('sets ThreadUI.inThread', function() {
            assert.isTrue(
              ThreadUI.inThread
            );
          });
          test('calls ThreadUI.renderMessages', function() {
            assert.ok(ThreadUI.renderMessages.called);
            assert.equal(
              ThreadUI.renderMessages.args[0][0], this.threadId
            );
          });
        });
      });
    });

    suite('> Switch to #group-view', function() {
      setup(function() {
        this.sinon.spy(GroupView, 'show');
        window.location.hash = '#group-view';
        MessageManager.onHashChange();
      });
      test('GroupView show method called', function() {
        assert.isTrue(GroupView.show.called);
      });
    });

    suite('> Switch to #report-view=1', function() {
      setup(function() {
        this.sinon.spy(ReportView, 'show');
        window.location.hash = '#report-view=1';
        MessageManager.onHashChange();
      });
      test('ReportView show method called', function() {
        assert.isTrue(ReportView.show.called);
      });
    });

  });

  suite('onDeliverySuccess', function() {
    suiteSetup(function() {
      this.mockEvent = {
        message: {
          id: 1
        }
      };
    });
    setup(function() {
      this.sinon.spy(ThreadUI, 'onDeliverySuccess');
      ReportView.mSetup();
    });

    test('Delivery Success outside report view', function() {
      window.location.hash = '#other-view';
      MessageManager.onDeliverySuccess(this.mockEvent);
      assert.isFalse(ReportView.refresh.called);
      sinon.assert.calledWith(ThreadUI.onDeliverySuccess,
        this.mockEvent.message);
    });
    test('Delivery Success in report view but id not match', function() {
      window.location.hash = '#report-view=0';
      MessageManager.onDeliverySuccess(this.mockEvent);
      assert.isFalse(ReportView.refresh.called);
      sinon.assert.calledWith(ThreadUI.onDeliverySuccess,
        this.mockEvent.message);
    });
    test('Delivery Success in report view and need refresh', function() {
      window.location.hash = '#report-view=1';
      MessageManager.onDeliverySuccess(this.mockEvent);
      assert.isTrue(ReportView.refresh.called);
      sinon.assert.calledWith(ThreadUI.onDeliverySuccess,
        this.mockEvent.message);
    });
  });

  suite('onReadSuccess', function() {
    suiteSetup(function() {
      this.mockEvent = {
        message: {
          id: 1
        }
      };
    });
    setup(function() {
      this.sinon.spy(ThreadUI, 'onReadSuccess');
      ReportView.mSetup();
    });

    test('Read Success outside report view', function() {
      window.location.hash = '#other-view';
      MessageManager.onReadSuccess(this.mockEvent);
      assert.isFalse(ReportView.refresh.called);
      sinon.assert.calledWith(ThreadUI.onReadSuccess,
        this.mockEvent.message);
    });
    test('Read Success in report view but id not match', function() {
      window.location.hash = '#report-view=0';
      MessageManager.onReadSuccess(this.mockEvent);
      assert.isFalse(ReportView.refresh.called);
      sinon.assert.calledWith(ThreadUI.onReadSuccess,
        this.mockEvent.message);
    });
    test('Read Success in report view and need refresh', function() {
      window.location.hash = '#report-view=1';
      MessageManager.onReadSuccess(this.mockEvent);
      assert.isTrue(ReportView.refresh.called);
      sinon.assert.calledWith(ThreadUI.onReadSuccess,
        this.mockEvent.message);
    });
  });

});
