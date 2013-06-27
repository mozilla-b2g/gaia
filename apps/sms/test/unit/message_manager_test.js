'use strict';

requireApp('sms/test/unit/utils_mockup.js');
requireApp('sms/test/unit/mock_messages.js');

requireApp('sms/test/unit/mock_thread_ui.js');
requireApp('sms/test/unit/mock_thread_list_ui.js');
requireApp('sms/test/unit/mock_threads.js');
requireApp('sms/test/unit/mock_navigatormoz_sms.js');

requireApp('sms/js/message_manager.js');

var mocksHelperForMessageManager = new MocksHelper([
  'ThreadUI',
  'ThreadListUI',
  'Threads'
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

  suite('on message sent > ', function() {

    setup(function() {
      sinon.spy(ThreadUI, 'appendMessage');
    });

    teardown(function() {
      ThreadUI.appendMessage.restore();
    });

    test('message is shown in the current thread if it belongs to the thread',
      function() {
        var sms = MockMessages.sms;
        // ensure the threadId is different
        Threads.currentId = sms.threadId + 1;
        MessageManager.onMessageSending({ message: sms });
        assert.isFalse(ThreadUI.appendMessage.called);
      }
    );
  });
});
