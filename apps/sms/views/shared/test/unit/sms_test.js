/*global MocksHelper, MockL10n, MockGestureDetector,
         loadBodyHTML, ConversationView, Threads, MessageManager,
         InboxView, Contacts, MockContact, MockThreadList,
         MockThreadMessages, getMockupedDate, Utils,
         Threads */
/*
  InboxView Tests
*/
'use strict';


require('/shared/js/event_dispatcher.js');
require('/shared/js/lazy_loader.js');
require('/shared/js/gesture_detector.js');
require('/shared/js/sticky_header.js');
require('/shared/test/unit/mocks/mock_gesture_detector.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_contact_photo_helper.js');
require('/shared/test/unit/mocks/mock_async_storage.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');

require('/views/shared/test/unit/mock_contact.js');
require('/views/shared/test/unit/mock_time_headers.js');
require('/views/shared/test/unit/mock_information.js');
require('/views/shared/test/unit/mock_settings.js');
require('/views/shared/test/unit/mock_inter_instance_event_dispatcher.js');
require('/views/shared/test/unit/utils_mockup.js');
require('/views/shared/test/unit/messages_mockup.js');
require('/views/shared/test/unit/thread_list_mockup.js');

require('/views/shared/js/selection_handler.js');
require('/views/shared/js/navigation.js');
require('/views/conversation/js/link_helper.js');
require('/services/js/drafts.js');
require('/views/shared/js/contacts.js');
require('/views/shared/js/utils.js');
require('/views/conversation/js/subject_composer.js');
require('/views/conversation/js/compose.js');
require('/services/js/threads.js');
require('/services/js/message_manager.js');
require('/views/conversation/js/attachment.js');
require('/views/inbox/js/inbox.js');
require('/views/conversation/js/recipients.js');
require('/views/conversation/js/conversation.js');
require('/views/shared/js/waiting_screen.js');
require('/views/shared/js/startup.js');
require('/views/shared/js/task_runner.js');


var MocksHelperForSmsUnitTest = new MocksHelper([
  'asyncStorage',
  'Settings',
  'TimeHeaders',
  'Information',
  'ContactPhotoHelper',
  'InterInstanceEventDispatcher',
  'LazyLoader'
]).init();

suite('SMS App Unit-Test', function() {
  MocksHelperForSmsUnitTest.attachTestHelpers();

  function stub(additionalCode, ret) {
    if (additionalCode && typeof additionalCode !== 'function') {
      ret = additionalCode;
    }

    var nfn = function() {
      nfn.callCount++;
      nfn.calledWith = [].slice.call(arguments);

      if (typeof additionalCode === 'function') {
        additionalCode.apply(this, arguments);
      }

      return ret;
    };
    nfn.callCount = 0;
    return nfn;
  }

  var nativeMozL10n = navigator.mozL10n;
  var realGestureDetector;

  suiteSetup(function() {
    navigator.mozL10n = MockL10n;
    realGestureDetector = window.GestureDetector;
    window.GestureDetector = MockGestureDetector;
  });

  suiteTeardown(function() {
    navigator.mozL10n = nativeMozL10n;
    window.GestureDetector = realGestureDetector;
  });

  // Define some useful functions for the following tests
  function getElementsInContainerByTag(container, tagName) {
    return container.querySelectorAll(tagName);
  }

  function assertNumberOfElementsInContainerByTag(container, number, tagName) {
    var elements = getElementsInContainerByTag(container, tagName);
    assert.equal(elements.length, number);
    return elements;
  }

  function getElementsInContainerByClass(container, className) {
    return container.getElementsByClassName(className);
  }

  function assertNumOfElementsByClass(container, number, className) {
    var elements = getElementsInContainerByClass(container, className);
    assert.equal(elements.length, number);
    return elements;
  }

  function threadSetupAppend() {
    var thread = {
      participants: ['287138'],
      body: 'Recibidas!',
      id: 9999,
      timestamp: Date.now(),
      type: 'sms',
      channel: 'sms'
    };

    Threads.set(9999, thread);
    InboxView.appendThread(thread);
    Threads.currentId = 9999;
  }

  // Previous setup
  suiteSetup(function() {
    // Create DOM structure
    loadBodyHTML('/index.html');
    // Clear if necessary...
    if (ConversationView.container) {
      ConversationView.container.innerHTML = '';
    }

    // ...And render
    ConversationView.init();
    InboxView.init();
  });

  suiteTeardown(function() {
    // cleanup
    window.document.body.innerHTML = '';
  });

  setup(function() {
    // We mockup the method for retrieving the threads
    this.sinon.stub(MessageManager, 'getThreads',
      function(options) {
        var threadsMockup = new MockThreadList();

        var each = options.each;
        var end = options.end;
        var done = options.done;

        for (var i = 0; i < threadsMockup.length; i++) {
          each && each(threadsMockup[i]);
        }

        end && end();
        done && done();
      });

    this.sinon.stub(MessageManager, 'getMessages',
      function(options, callback) {

        var each = options.each, // CB which manage every message
          // filter = options.filter, // unused mozMessageFilter
          // invert = options.invert, // unused invert selection
          end = options.end,   // CB when all messages retrieved
          endArgs = options.endArgs, //Args for end
          done = options.done;

        var messagesMockup = new MockThreadMessages();
        for (var i = 0, l = messagesMockup.length; i < l; i++) {
          each(messagesMockup[i]);
        }
        end && end(endArgs);
        done && done();
      });

    // We mockup the method for retrieving the info
    // of a contact given a number
    this.sinon.stub(Contacts, 'findByString', function(tel) {
      // Get the contact
      if (tel === '1977') {
        return Promise.resolve(MockContact.list());
      }

      return Promise.resolve(null);
    });

    this.sinon.stub(Contacts, 'findByPhoneNumber', function(tel) {
      // Get the contact
      if (tel === '1977') {
        return Promise.resolve(MockContact.list());
      }

      return Promise.resolve(null);
    });
  });

  // Let's go with tests!

  // First suite it's related to review Thread-View
  suite('Threads-list', function() {
    var _tci;
    // Setup. We need an async. way due to threads are rendered
    // async.
    setup(function(done) {
      this.sinon.spy(InboxView, 'setContact');

      InboxView.once('visually-loaded', () => done());
      InboxView.renderThreads();

      _tci = InboxView.updateSelectionStatus;
    });
    // We are gonna review the HTML structure with this suite
    suite('Threads-list rendering', function() {

      test('properly updates in response to an arriving message of a ' +
        'different type', function() {
        InboxView.container.textContent = '';

        var container = InboxView.container;

        var each = function(thread) {
          var newMessage = {
            threadId: thread.id,
            sender: thread.participants[0],
            delivery: 'received',
            timestamp: +thread.timestamp,
            type: thread.lastMessageType === 'mms' ? 'sms' : 'mms'
          };
          MessageManager.onMessageReceived({
            message: newMessage
          });
        };

        var options = {
          each: each
        };

        MessageManager.getThreads(options);
        var mmsThreads = container.querySelectorAll(
          '[data-last-message-type="mms"]'
        );
        var smsThreads = container.querySelectorAll(
          '[data-last-message-type="sms"]'
        );

        assert.equal(mmsThreads.length, 4);
        assert.equal(smsThreads.length, 1);
      });

      test('Check HTML structure', function() {
        // Check the HTML structure, and if it fits with Building Blocks

        var container = InboxView.container;

        // Given our mockup, we should have 4 grous UL/HEADER
        assertNumberOfElementsInContainerByTag(container, 4, 'ul');
        assertNumberOfElementsInContainerByTag(container, 4, 'header');

        // We know as well that we have, in total, 5 threads
        assertNumberOfElementsInContainerByTag(container, 5, 'li');
        assertNumberOfElementsInContainerByTag(container, 5, 'a');

        var mmsThreads = container.querySelectorAll(
          '[data-last-message-type="mms"]'
        );
        var smsThreads = container.querySelectorAll(
          '[data-last-message-type="sms"]'
        );
        assert.equal(mmsThreads.length, 1);
        assert.equal(smsThreads.length, 4);

        // In our mockup we shoul group the threads following day criteria
        // In the second group, we should have 2 threads
        var date = getMockupedDate(2);
        var threadsContainer =
          document.getElementById('threadsContainer_' +
            Utils.getDayDate(+date));
        assertNumberOfElementsInContainerByTag(threadsContainer, 2, 'li');
      });

      test('Render unread style properly', function() {
        // We know that only one thread is unread
        assertNumOfElementsByClass(InboxView.container, 1, 'unread');
      });

      test('Update thread with contact name', function(done) {
        // Given a number, we should retrieve the contact and update the info
        var threadWithContact = document.getElementById('thread-1');
        var spy = InboxView.setContact.withArgs(threadWithContact);
        var contactSelector = '.threadlist-item-title bdi';
        spy.firstCall.returnValue.then(() => {
          assert.equal(
            threadWithContact.querySelector(contactSelector).innerHTML,
            'Pepito O\'Hare'
          );
        }).then(done, done);
      });
    });

    // Review the edit-mode functionality and markup
    suite('Threads-list edit mode', function() {

      setup(function() {
        // InboxView.setContact is already a spy, but here we need a stub.
        // So we restore the original function first, and then create a stub.
        InboxView.setContact.restore();
        this.sinon.stub(InboxView, 'setContact');
      });

      test('Check edit mode form', function() {
        var container = InboxView.container;
        // Do we have all inputs ready?
        assertNumberOfElementsInContainerByTag(container, 5, 'input');
      });

      test('Select all/Deselect All buttons', function() {
        var i;

        InboxView.startEdit();
        // Retrieve all inputs
        var inputs = InboxView.container.getElementsByTagName('input');
        // Activate all inputs
        for (i = inputs.length - 1; i >= 0; i--) {
          inputs[i].checked = true;
          InboxView.selectionHandler.select(inputs[i].value);
        }
        var checkUncheckAllButton =
          document.getElementById('threads-check-uncheck-all-button');

        InboxView.updateSelectionStatus();
        assert.equal(
          checkUncheckAllButton.getAttribute('data-l10n-id'),
          'deselect-all'
        );
        // Deactivate all inputs
        for (i = inputs.length - 1; i >= 0; i--) {
          inputs[i].checked = false;
          InboxView.selectionHandler.unselect(inputs[i].value);
        }
        InboxView.updateSelectionStatus();
        assert.equal(
          checkUncheckAllButton.getAttribute('data-l10n-id'),
          'select-all'
        );
        assert.isFalse(checkUncheckAllButton.disabled);
        // Activate only one
        inputs[0].checked = true;
        InboxView.selectionHandler.select(inputs[0].value);
        InboxView.updateSelectionStatus();
        assert.equal(
          checkUncheckAllButton.getAttribute('data-l10n-id'),
          'select-all'
        );
        assert.isFalse(checkUncheckAllButton.disabled);
      });

      test('Read/Unread buttons', function() {
        var readUnreadButton;

        InboxView.startEdit();
        // Retrieve all inputs
        var inputs = InboxView.container.getElementsByTagName('input');
        readUnreadButton =
          document.querySelector('#threads-read-unread-button');

        // unread button enabled when selected threads has read message only
        Array.forEach(inputs, (input) => {
          input.checked = true;
          Threads.get(input.value).unreadCount = 0;
          InboxView.selectionHandler.select(input.value);
        });
        InboxView.updateSelectionStatus();
        assert.equal(readUnreadButton.dataset.action, 'mark-as-unread');

        // read button enabled when selected threads has unread message only
        Array.forEach(inputs, (input) => {
          input.checked = true;
          Threads.get(input.value).unreadCount = 1;
          InboxView.selectionHandler.select(input.value);
        });
        InboxView.updateSelectionStatus();
        assert.equal(readUnreadButton.dataset.action, 'mark-as-read');

        // read button enabled when selected thread has read & unread message
        Array.forEach(inputs, (input, key) => {
          if(key === 0) {
            Threads.get(input.value).unreadCount = 0;
          }
          input.checked = true;
          InboxView.selectionHandler.select(input.value);
        });
        InboxView.updateSelectionStatus();
        assert.equal(readUnreadButton.dataset.action, 'mark-as-read');

        // read/unread button disabled when no any threads are selected
        Array.forEach(inputs, (input) => {
          input.checked = false;
          InboxView.selectionHandler.unselect(input.value);
        });
        InboxView.updateSelectionStatus();
        assert.isTrue(readUnreadButton.disabled);

        // read/unread button disabled when only drafts are selected
        Array.forEach(inputs, (input) => {
          Threads.get(input.value).isDraft = true;
          input.checked = true;
          InboxView.selectionHandler.select(input.value);
        });
        InboxView.updateSelectionStatus();
        assert.isTrue(readUnreadButton.disabled);
      });

      test('Select all while receiving new thread', function(done) {
        InboxView.startEdit();
        InboxView.selectionHandler.toggleCheckedAll(true);

        var checkboxes =
          InboxView.container.querySelectorAll('input[type=checkbox]');
        var checkUncheckAllButton =
          document.getElementById('threads-check-uncheck-all-button');
        assert.equal(5,
          [].slice.call(checkboxes).filter(function(i) {
            return i.checked;
          }).length, 'All items should be checked');

        // now a new message comes in for a new thread...
        threadSetupAppend();

        checkboxes =
          InboxView.container.querySelectorAll('input[type=checkbox]');

        assert.equal(checkboxes.length, 6);
        assert.equal(checkboxes[4].checked, true);
        assert.equal(checkboxes[2].checked, true);
        // new checkbox should have been added
        assert.equal(checkboxes[0].checked, false);

        // Select-Deselect all should both be enabled
        assert.isFalse(checkUncheckAllButton
          .hasAttribute('disabled'), 'Check-Uncheck all enabled');

        done();
      });

      test('updateSelectionStatus should fire in edit mode', function(done) {
        InboxView.startEdit();
        InboxView.updateSelectionStatus = stub();

        threadSetupAppend();

        assert.equal(InboxView.updateSelectionStatus.callCount, 1);
        done();
      });

      test('updateSelectionStatus should not fire in normal mode',
        function(done) {
        InboxView.cancelEdit();
        InboxView.updateSelectionStatus = stub();

        threadSetupAppend();

        assert.equal(InboxView.updateSelectionStatus.callCount, 0);
        done();
      });
    });

    teardown(function() {
      InboxView.container.innerHTML = '';
      InboxView.updateSelectionStatus = _tci;
    });
  });

  // Suite for reviewing Thread-view ("bubbles" view)
  suite('Messages given a thread', function() {
    var _tci;
    // Setup for getting all messages rendered before every test
    setup(function(done) {
      ConversationView.renderMessages(1, done);
      _tci = ConversationView.updateSelectionStatus;
    });

    suite('Thread-messages rendering (bubbles view)', function() {
      test('Check HTML structure', function() {
        // It should have 3 bubbles
        assertNumberOfElementsInContainerByTag(
          ConversationView.container, 5, 'li'
        );
        // Grouped in 2 sets
        assertNumberOfElementsInContainerByTag(
          ConversationView.container, 3, 'header'
        );
        assertNumberOfElementsInContainerByTag(
          ConversationView.container, 3, 'ul'
        );
      });

      test('Check message status & styles', function() {
        assertNumOfElementsByClass(ConversationView.container, 1, 'sending');
        assertNumOfElementsByClass(ConversationView.container, 1, 'sent');
        assertNumOfElementsByClass(ConversationView.container, 1, 'received');
        assertNumOfElementsByClass(ConversationView.container, 2, 'error');
      });
    });

    suite('Thread-messages Edit mode (bubbles view)', function() {
      // Setup for getting all messages rendered before every test
      setup(function(done) {
        this.sinon.spy(ConversationView, 'updateSelectionStatus');
        this.sinon.stub(InboxView, 'setContact');
        ConversationView.renderMessages(1, function() {
          ConversationView.startEdit();
          done();
        });

      });

      teardown(function() {
        ConversationView.cancelEdit();
      });

      test('Check edit mode form', function() {
        assertNumberOfElementsInContainerByTag(
          ConversationView.container, 5, 'input'
        );
      });

      test('Select/Deselect all', function() {
        var i;
        var inputs = ConversationView.container.getElementsByTagName('input');
        // Activate all inputs
        for (i = inputs.length - 1; i >= 0; i--) {
          inputs[i].checked = true;
          ConversationView.selectionHandler.select(inputs[i].value);
        }

        var checkUncheckAllButton =
          document.getElementById('messages-check-uncheck-all-button');

        ConversationView.updateSelectionStatus();
        assert.isFalse(checkUncheckAllButton.disabled);

        // Deactivate all inputs
        for (i = inputs.length - 1; i >= 0; i--) {
          inputs[i].checked = false;
          ConversationView.selectionHandler.unselect(inputs[i].value);
        }
        ConversationView.updateSelectionStatus();
        assert.isFalse(checkUncheckAllButton.disabled);

        // Activate only one
        inputs[0].checked = true;
        ConversationView.selectionHandler.select(inputs[0].value);
        ConversationView.updateSelectionStatus();
        assert.isFalse(checkUncheckAllButton.disabled);
      });

      test('Select all while receiving new message', function(done) {
        this.sinon.stub(Utils, 'confirm').returns(Promise.resolve());
        this.sinon.stub(Threads, 'unregisterMessage');
        var checkboxes = Array.from(ConversationView.container.querySelectorAll(
          'input[type=checkbox]'
        ));
        var checkUncheckAllButton = document.getElementById(
          'messages-check-uncheck-all-button'
        );

        // Activate all inputs
        for (var i = checkboxes.length - 1; i >= 0; i--) {
          checkboxes[i].checked = true;
          ConversationView.selectionHandler.select(checkboxes[i].value);
        }

        assert.equal(checkboxes.length, 5);
        assert.equal(
          checkboxes.length,
          checkboxes.filter((item) => item.checked).length,
          'All items should be checked'
        );
        // now a new message comes in...
        var incomingMessage = {
          sender: '197746797',
          body: 'Recibidas!',
          delivery: 'received',
          id: 9999,
          threadId: 1,
          timestamp: Date.now(),
          type: 'sms',
          channel: 'sms'
        };

        ConversationView.appendMessage(incomingMessage).then(() => {
          // new checkbox should have been added
          checkboxes = ConversationView.container.querySelectorAll(
            'input[type=checkbox]'
          );
          assert.equal(checkboxes.length, 6);
          assert.equal(checkboxes[2].checked, true);
          assert.equal(checkboxes[5].checked, false);

          // Select-Deselect all should both be enabled
          assert.isFalse(
            checkUncheckAllButton.hasAttribute('disabled'),
            'Check-Uncheck all enabled'
          );

          // now delete the selected messages...
          this.sinon.stub(MessageManager, 'deleteMessages').yields();

          var getMessageReq = {
            result: incomingMessage
          };
          this.sinon.stub(MessageManager, 'getMessage').returns(getMessageReq);

          return ConversationView.delete().then(() => {
            getMessageReq.onsuccess();
            sinon.assert.calledOnce(MessageManager.deleteMessages);
            assert.equal(MessageManager.deleteMessages.args[0][0].length, 5);
            assert.equal(
              ConversationView.container.querySelectorAll('li').length,
              1,
              'correct number of Thread li'
            );
            var messageContent = ConversationView.container.querySelector(
              '#message-9999 p'
            );
            assert.equal(messageContent.textContent, 'Recibidas!');
          });
        }).then(done, done);
      });

      test('updateSelectionStatus should fire in edit mode', function(done) {
        ConversationView.startEdit();

        // now a new message comes in...
        ConversationView.appendMessage({
          sender: '197746797',
          body: 'Recibidas!',
          delivery: 'received',
          id: 9999,
          timestamp: Date.now(),
          channel: 'sms'
        }).then(() => {
          assert.ok(ConversationView.updateSelectionStatus.called);
        }).then(done, done);
      });

      test('updateSelectionStatus should not fire in normal mode',
        function(done) {
        ConversationView.cancelEdit();
        ConversationView.updateSelectionStatus = stub();

        // now a new message comes in...
        ConversationView.appendMessage({
          sender: '197746797',
          body: 'Recibidas!',
          delivery: 'received',
          id: 9999,
          timestamp: Date.now(),
          channel: 'sms'
        }).then(() => {
          assert.equal(ConversationView.updateSelectionStatus.callCount, 0);
        }).then(done, done);
      });
    });

    teardown(function() {
      ConversationView.container.innerHTML = '';
      ConversationView.updateSelectionStatus = _tci;
    });
  });

  suite('URL Links in SMS', function() {
    var Message = {
      id: '987',
      body: 'Hello URL',
      type: 'sms'
    };

    //test
    test('#Test URL in message', function(done) {
      var messageBody = 'For more details visit' +
      ' Yahoo.com, http://www.df.com' +
      ' or visit faq mail.google.com/mail/help/intl/en/about.html.' +
      ' Also google.com/search?q=long+url+with+queries&sourceid=firefox' +
      ' or \nhttps://secured.web:9080';
      var id = '123456';
      Message.id = id;
      Message.body = messageBody;
      ConversationView.buildMessageDOM(Message, false).then((messageDOM) => {
        var anchors = messageDOM.querySelectorAll('[data-url]');
        assert.equal(anchors.length, 5,
          '5 URLs are tappable in message');
        assert.equal(anchors[0].dataset.url,
          'http://Yahoo.com', 'First url is http://Yahoo.com');
        assert.equal(anchors[1].dataset.url,
          'http://www.df.com', 'Second url is http://www.df.com');
        assert.equal(anchors[2].dataset.url,
          'http://mail.google.com/mail/help/intl/en/about.html',
          'Third url is http://mail.google.com/mail/help/intl/en/about.html');
        assert.equal(anchors[3].dataset.url,
          'http://google.com/search?q=long+url+with+queries&sourceid=firefox',
          'google.com/search?q=long+url+with+queries&sourceid=firefox is ' +
          'fourth and it comes with queries!');
        assert.equal(anchors[4].dataset.url,
          'https://secured.web:9080',
          'Fifth is https://secured.web:9080, secured and after a line break');
        // The links generated shouldn have 'href'
        var anchorsLength = anchors.length;
        for (var i = 0; i < anchorsLength; i++) {
          assert.equal(anchors[i].href, '');
        }
      }).then(done, done);
    });

    test('#Test URL with phone, email in message', function(done) {
      var messageBody = 'Email at cs@yahoo.com, For more details' +
        ' visit http://www.mozilla.org/en-US/firefox/fx/, www.gmail.com' +
        ' or call 897-890-8907';
      var id = '123457';
      Message.id = id;
      Message.body = messageBody;
      ConversationView.buildMessageDOM(Message, false).then((messageDOM) => {
        var anchors = messageDOM.querySelectorAll('[data-url]');
        assert.equal(anchors.length, 2,
          '2 URLs are tappable in message');
        assert.equal(anchors[0].dataset.url,
          'http://www.mozilla.org/en-US/firefox/fx/',
           'First url is http://www.mozilla.org/en-US/firefox/fx/');
        assert.equal(anchors[1].dataset.url,
          'http://www.gmail.com', 'Second url is http://www.gmail.com');
        // The links generated shouldn have 'href'
        var anchorsLength = anchors.length;
        for (var i = 0; i < anchorsLength; i++) {
          assert.equal(anchors[i].href, '');
        }
      }).then(done, done);
    });
  });

  suite('EmailAddress Links in SMS', function() {
    var Message = {
      id: '1234',
      body: 'Hello n Welcome',
      type: 'sms'
    };

    //test
    test('#Test EmailAddress in message', function(done) {
      var messageBody = 'Email abc@gmail.com or myself@my.com,rs@1 ' +
                      'from yahoo.com';
      var id = '123456';
      Message.id = id;
      Message.body = messageBody;
      ConversationView.buildMessageDOM(Message, false).then((messageDOM) => {
        var anchors = messageDOM.querySelectorAll('[data-email]');
        assert.equal(anchors.length, 2,
          '2 Email Addresses are tappable in message');
        assert.equal(anchors[0].dataset.email,
          'abc@gmail.com', 'First email is abc@gmail.com');
        assert.equal(anchors[1].dataset.email,
          'myself@my.com', 'Second email is myself@my.com');
        // The email links generated shouldn have 'href'
        var anchorsLength = anchors.length;
        for (var i = 0; i < anchorsLength; i++) {
          assert.equal(anchors[i].href, '');
        }
      }).then(done, done);
    });

    test('#Test with phone numbers, url and email in a message',
      function(done) {

      var messageBody = 'Send a text to 729725 (PAYPAL).' +
      ' money@paypal.com hi-there@mail.com,sup.port@efg.com and 35622.00' +
      ' the cs@yahoo.co.in email. www.yahoo.com,payapal.com are urls.' +
      ' You can even enter 995-345-5678 6787897890.';
      var id = '123457';
      Message.id = id;
      Message.body = messageBody;
      ConversationView.buildMessageDOM(Message, false).then((messageDOM) => {
        var anchors = messageDOM.querySelectorAll('[data-email]');
        assert.equal(anchors.length, 4,
          '4 links are attached for  email in DOM');
        assert.equal(anchors[0].dataset.email,
          'money@paypal.com', 'First email is money@paypal.com');
        assert.equal(anchors[1].dataset.email,
          'hi-there@mail.com', 'Second email is hi-there@mail.com');
        assert.equal(anchors[2].dataset.email,
          'sup.port@efg.com', 'Third email is sup.port@efg.com');
        assert.equal(anchors[3].dataset.email,
          'cs@yahoo.co.in', 'Fourth email is cs@yahoo.co.in');
        // The email links generated shouldn have 'href'
        var anchorsLength = anchors.length;
        for (var i = 0; i < anchorsLength; i++) {
          assert.equal(anchors[i].href, '');
        }
      }).then(done, done);
    });
  });

  suite('Phone Links in SMS', function() {
    var Message = {
      id: '123',
      body: 'Hello there',
      type: 'sms'
    };

    //test
    test('#numberWithDash', function(done) {
      var messageBody = 'Hello there, here are numbers with ' +
                      'dashes 408-746-9721, 4087469721, 7469721';
      var id = '12345';
      Message.id = id;
      Message.body = messageBody;
      ConversationView.buildMessageDOM(Message, false).then((messageDOM) => {
        var anchors = messageDOM.querySelectorAll('[data-dial]');
        assert.equal(anchors.length, 3,
          '3 Contact handlers are attached for 3 phone numbers in DOM');
        assert.equal(anchors[0].dataset.dial,
          '408-746-9721', 'First number link is 408-746-9721');
        assert.equal(anchors[1].dataset.dial,
          '4087469721', 'Second number is 4087469721');
        assert.equal(anchors[2].dataset.dial,
          '7469721', 'Third number is 7469721');
      }).then(done, done);
    });

    test('#complexTest with 7 digit numbers, ip, decimals', function(done) {
      var messageBody = '995-382-7369 futures to a 4458901 slight' +
        ' 789-7890 rebound +1-556-667-7789 on Wall Street 9953827369' +
        ' on Wednesday, +12343454567 with 55.55 futures +919810137553' +
        ' for the S&P 500 up 0.34 percent, Dow Jones futures up 0.12' +
        ' percent100 futures up 0.51 percent at 0921 GMT.';
      var id = '12346';
      Message.id = id;
      Message.body = messageBody;
      ConversationView.buildMessageDOM(Message, false).then((messageDOM) => {
        var anchors = messageDOM.querySelectorAll('[data-dial]');

        assert.equal(anchors.length, 7,
          '7 Contact handlers are attached for 7 phone numbers in DOM');
        assert.equal(anchors[0].dataset.dial,
          '995-382-7369', 'First number is 995-382-7369');
        assert.equal(anchors[1].dataset.dial,
          '4458901', 'Second number is 4458901');
        assert.equal(anchors[2].dataset.dial,
          '789-7890', 'Third number is 789-7890');
        assert.equal(anchors[3].dataset.dial,
          '+1-556-667-7789', 'Fourth number is +1-556-667-7789');
        assert.equal(anchors[4].dataset.dial,
          '9953827369', 'Fifth number is 9953827369');
        assert.equal(anchors[5].dataset.dial,
          '+12343454567', 'Sixth number is +12343454567');
        assert.equal(anchors[6].dataset.dial,
          '+919810137553', 'Seventh number is +919810137553');
        // The phone links generated shouldn have 'href'
        var anchorsLength = anchors.length;
        for (var i = 0; i < anchorsLength; i++) {
          assert.equal(anchors[i].href, '');
        }
      }).then(done, done);
    });
  });

// TEMPORARILY DISABLING THESE TESTS SINCE THEY ARE SINGLE
// RECIPIENT DEPENDENT.

// suite('Sending SMS from new screen', function() {
//   var contacts = null;

//   setup(function() {
//     contacts = MockContact.list();
//   });

//   test('Sending to contact should put in right thread', function(done) {
//     var contact = contacts[0];

//     Contacts.findByString = stub(function(str, callback) {
//       callback(contacts);
//     });
//     Contacts.findByPhoneNumber = stub(function(str, callback) {
//       callback(contacts);
//     });

//     MessageManager.onHashChange = stub();
//     MessageManager.send = stub();

//     window.location.hash = '#new';

//     ConversationView.recipients.push({
//       name: contact.name,
//       phoneNumber: contact.tel[0].value,
//       source: 'contacts'
//     });

//     // Launch an input
//     ConversationView.input.value = 'Jo quiro';
//     ConversationView.sendMessage();

//     setTimeout(function() {
//       assert.equal(Contacts.findByString.callCount, 0);
//       assert.equal(Contacts.findByPhoneNumber.callCount, 1);
//       assert.equal(MessageManager.send.callCount, 1);
//       assert.equal(MessageManager.send.calledWith[0], contact.tel[0].value);
//       assert.equal(MessageManager.send.calledWith[1], 'Jo quiro');

//       window.location.hash = '';
//       done();
//     }, 30);
//   });
//   test('Sending to short nr should not link to contact', function(done) {
//     // findByString does a substring find
//     Contacts.findByString = stub(function(str, callback) {
//       callback(contacts);
//     });
//     Contacts.findByPhoneNumber = stub(function(str, callback) {
//       callback([]);
//     });

//     MessageManager.onHashChange = stub();
//     MessageManager.send = stub();

//     window.location.hash = '#new';

//     ConversationView.recipients.push({
//       phoneNumber: '2471'
//     });

//     ConversationView.input.value = 'Short';
//     ConversationView.sendMessage();

//     setTimeout(function() {
//       assert.equal(Contacts.findByString.callCount, 0);
//       assert.equal(Contacts.findByPhoneNumber.callCount, 1);
//       assert.equal(MessageManager.send.callCount, 1);
//       assert.equal(
//         MessageManager.send.calledWith[0], ConversationView.recipients[0]
//       );
//       assert.equal(MessageManager.send.calledWith[1], 'Short');

//       window.location.hash = '';
//       done();
//     }, 30);
//     assert.equal(send.callCount, 1);
//     // Check for the first number in the recipients list
//     assert.equal(send.calledWith[0][0], '2471');
//     assert.equal(send.calledWith[1], 'Short');

//     window.location.hash = '';
//   });
// });
});
