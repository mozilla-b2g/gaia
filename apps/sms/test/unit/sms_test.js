/*global MocksHelper, MockL10n, MockGestureDetector,
         loadBodyHTML, ThreadUI, MessageManager, MockNavigatormozMobileMessage,
         ThreadListUI, Contacts, MockContact, MockThreadList,
         MockThreadMessages, getMockupedDate, Utils */
/*
  ThreadListUI Tests
*/
'use strict';


require('/shared/js/lazy_loader.js');
require('/shared/js/l10n.js');
require('/shared/js/l10n_date.js');
require('/shared/js/gesture_detector.js');
require('/shared/js/async_storage.js');

require('/shared/test/unit/mocks/mock_gesture_detector.js');
requireApp('sms/test/unit/mock_contact.js');
requireApp('sms/test/unit/mock_l10n.js');
requireApp('sms/test/unit/mock_time_headers.js');
requireApp('sms/test/unit/mock_navigatormoz_sms.js');
requireApp('sms/test/unit/mock_attachment_menu.js');
requireApp('sms/test/unit/mock_information.js');

requireApp('sms/js/link_helper.js');
requireApp('sms/js/drafts.js');
requireApp('sms/js/contacts.js');
requireApp('sms/js/fixed_header.js');
requireApp('sms/js/utils.js');
requireApp('sms/js/compose.js');
requireApp('sms/js/threads.js');
requireApp('sms/test/unit/utils_mockup.js');
requireApp('sms/test/unit/messages_mockup.js');
requireApp('sms/test/unit/thread_list_mockup.js');
requireApp('sms/js/message_manager.js');
requireApp('sms/js/attachment.js');
requireApp('sms/js/thread_list_ui.js');
requireApp('sms/js/recipients.js');
requireApp('sms/js/thread_ui.js');
requireApp('sms/js/waiting_screen.js');
requireApp('sms/js/startup.js');

var MocksHelperForSmsUnitTest = new MocksHelper([
  'AttachmentMenu',
  'TimeHeaders',
  'Information'
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
  var realMozMobileMessage;
  var boundOnHashChange;
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

  // Previous setup
  suiteSetup(function() {
    // Create DOM structure
    loadBodyHTML('/index.html');
    // Clear if necessary...
    if (ThreadUI.container) {
      ThreadUI.container.innerHTML = '';
    }

    // ...And render
    ThreadUI.init();
    ThreadListUI.init();
    boundOnHashChange = MessageManager.onHashChange.bind(MessageManager);
    window.addEventListener(
      'hashchange', boundOnHashChange
    );
    realMozMobileMessage = ThreadUI._mozMobileMessage;
    ThreadUI._mozMobileMessage = MockNavigatormozMobileMessage;
  });

  suiteTeardown(function() {
    ThreadUI._mozMobileMessage = realMozMobileMessage;
    // cleanup
    window.document.body.innerHTML = '';
    window.removeEventListener('hashchange', boundOnHashChange);
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
    this.sinon.stub(Contacts, 'findByString', function(tel, callback) {
      // Get the contact
      if (tel === '1977') {
        callback(MockContact.list());
      }
    });

    this.sinon.stub(Contacts, 'findByPhoneNumber', function(tel, callback) {
      // Get the contact
      if (tel === '1977') {
        callback(MockContact.list());
      }
    });

  });

  // Let's go with tests!

  // First suite it's related to review Thread-View
  suite('Threads-list', function() {
    var _tci;
    // Setup. We need an async. way due to threads are rendered
    // async.
    setup(function(done) {
      this.sinon.spy(navigator.mozL10n, 'localize');
      ThreadListUI.renderThreads(done);
      _tci = ThreadListUI.checkInputs;
    });
    // We are gonna review the HTML structure with this suite
    suite('Threads-list rendering', function() {

      test('properly updates in response to an arriving message of a ' +
        'different type', function() {
        ThreadListUI.container.textContent = '';

        var container = ThreadListUI.container;

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

        var container = ThreadListUI.container;

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
        assertNumOfElementsByClass(ThreadListUI.container, 1, 'unread');
      });

      test('Update thread with contact name localized', function() {
        // Given a number, we should retrieve the contact and update the info
        var threadWithContact = document.getElementById('thread-1');
        var contactName = threadWithContact.getElementsByClassName('name')[0];
        assert.deepEqual(navigator.mozL10n.localize.args[0],
          [contactName, 'thread-header-text', {name: 'Pepito O\'Hare', n: 0}]);
      });
    });

    // Review the edit-mode functionality and markup
    suite('Threads-list edit mode', function() {

      test('Check edit mode form', function() {
        var container = ThreadListUI.container;
        // Do we have all inputs ready?
        assertNumberOfElementsInContainerByTag(container, 5, 'input');
      });

      test('Select all/Deselect All buttons', function() {
        var i;

        ThreadListUI.startEdit();
        // Retrieve all inputs
        var inputs = ThreadListUI.container.getElementsByTagName('input');
        // Activate all inputs
        for (i = inputs.length - 1; i >= 0; i--) {
          inputs[i].checked = true;
        }

        var checkAllButton =
          document.getElementById('threads-check-all-button');
        var uncheckAllButton =
          document.getElementById('threads-uncheck-all-button');

        ThreadListUI.checkInputs();
        assert.isTrue(checkAllButton.disabled);
        assert.isFalse(uncheckAllButton.disabled);
        // Deactivate all inputs
        for (i = inputs.length - 1; i >= 0; i--) {
          inputs[i].checked = false;
        }
        ThreadListUI.checkInputs();
        assert.isFalse(checkAllButton.disabled);
        assert.isTrue(uncheckAllButton.disabled);
        // Activate only one
        inputs[0].checked = true;
        ThreadListUI.checkInputs();
        assert.isFalse(checkAllButton.disabled);
        assert.isFalse(uncheckAllButton.disabled);
      });

      test('Select all while receiving new thread', function(done) {
        ThreadListUI.startEdit();
        ThreadListUI.toggleCheckedAll(true);

        var checkboxes =
          ThreadListUI.container.querySelectorAll('input[type=checkbox]');
        assert.equal(5,
          [].slice.call(checkboxes).filter(function(i) {
            return i.checked;
          }).length, 'All items should be checked');

        // now a new message comes in for a new thread...
        ThreadListUI.appendThread({
          participants: ['287138'],
          body: 'Recibidas!',
          id: 9999,
          timestamp: Date.now(),
          type: 'sms',
          channel: 'sms'
        });

        checkboxes =
          ThreadListUI.container.querySelectorAll('input[type=checkbox]');

        assert.equal(checkboxes.length, 6);
        assert.equal(ThreadListUI.allInputs.length, 6,
          '.allInputs should be in sync');
        assert.equal(checkboxes[4].checked, true);
        assert.equal(checkboxes[2].checked, true);
        // new checkbox should have been added
        assert.equal(checkboxes[0].checked, false);

        // Select all and Deselect all should both be enabled
        assert.isFalse(document.getElementById('threads-check-all-button')
          .hasAttribute('disabled'), 'Check all enabled');
        assert.isFalse(document.getElementById('threads-uncheck-all-button')
          .hasAttribute('disabled'), 'Uncheck all enabled');

        done();
      });

      test('checkInputs should fire in edit mode', function(done) {
        ThreadListUI.startEdit();
        ThreadListUI.checkInputs = stub();

        ThreadListUI.appendThread({
          participants: ['287138'],
          body: 'Recibidas!',
          id: 9999,
          timestamp: Date.now(),
          type: 'sms',
          channel: 'sms'
        });

        assert.equal(ThreadListUI.checkInputs.callCount, 1);
        done();
      });

      test('checkInputs should not fire in normal mode', function(done) {
        ThreadListUI.cancelEdit();
        ThreadListUI.checkInputs = stub();

        ThreadListUI.appendThread({
          participants: ['287138'],
          body: 'Recibidas!',
          id: 9999,
          timestamp: Date.now(),
          channel: 'sms'
        });

        assert.equal(ThreadListUI.checkInputs.callCount, 0);
        done();
      });
    });

    teardown(function() {
      ThreadListUI.container.innerHTML = '';
      ThreadListUI.checkInputs = _tci;
    });
  });

  // Suite for reviewing Thread-view ("bubbles" view)
  suite('Messages given a thread', function() {
    var _tci;
    // Setup for getting all messages rendered before every test
    setup(function(done) {
      ThreadUI.renderMessages(1, done);
      _tci = ThreadUI.checkInputs;
    });

    suite('Thread-messages rendering (bubbles view)', function() {
      test('Check HTML structure', function() {
        // It should have 3 bubbles
        assertNumberOfElementsInContainerByTag(ThreadUI.container, 5, 'li');
        // Grouped in 2 sets
        assertNumberOfElementsInContainerByTag(ThreadUI.container, 3, 'header');
        assertNumberOfElementsInContainerByTag(ThreadUI.container, 3, 'ul');
      });

      test('Check message status & styles', function() {
        assertNumOfElementsByClass(ThreadUI.container, 1, 'sending');
        assertNumOfElementsByClass(ThreadUI.container, 1, 'sent');
        assertNumOfElementsByClass(ThreadUI.container, 1, 'received');
        assertNumOfElementsByClass(ThreadUI.container, 2, 'error');
      });
    });

    suite('Thread-messages Edit mode (bubbles view)', function() {
      // Setup for getting all messages rendered before every test
      setup(function(done) {
        this.sinon.spy(ThreadUI, 'checkInputs');
        ThreadUI.renderMessages(1, function() {
          done();
        });
      });

      test('Check edit mode form', function() {
        assertNumberOfElementsInContainerByTag(ThreadUI.container, 5, 'input');
      });

      test('Select/Deselect all', function() {
        var i;
        var inputs = ThreadUI.container.getElementsByTagName('input');
        // Activate all inputs
        for (i = inputs.length - 1; i >= 0; i--) {
          inputs[i].checked = true;
          ThreadUI.chooseMessage(inputs[i]);
        }

        var checkAllButton =
          document.getElementById('messages-check-all-button');
        var uncheckAllButton =
          document.getElementById('messages-uncheck-all-button');

        ThreadUI.checkInputs();
        assert.isTrue(checkAllButton.disabled);
        assert.isFalse(uncheckAllButton.disabled);

        // Deactivate all inputs
        for (i = inputs.length - 1; i >= 0; i--) {
          inputs[i].checked = false;
          ThreadUI.chooseMessage(inputs[i]);
        }
        ThreadUI.checkInputs();
        assert.isFalse(checkAllButton.disabled);
        assert.isTrue(uncheckAllButton.disabled);

        // Activate only one
        inputs[0].checked = true;
        ThreadUI.chooseMessage(inputs[0]);
        ThreadUI.checkInputs();
        assert.isFalse(checkAllButton.disabled);
        assert.isFalse(uncheckAllButton.disabled);
      });

      test('Select all while receiving new message', function(done) {
        ThreadUI.startEdit();
        ThreadUI.toggleCheckedAll(true);

        var checkboxes =
          ThreadUI.container.querySelectorAll('input[type=checkbox]');
        assert.equal(checkboxes.length, 5);
        assert.equal(checkboxes.length,
          [].slice.call(checkboxes).filter(function(i) {
            return i.checked;
          }).length, 'All items should be checked');

        // now a new message comes in...
        var incomingMessage = {
          sender: '197746797',
          body: 'Recibidas!',
          delivery: 'received',
          id: 9999,
          timestamp: Date.now(),
          type: 'sms',
          channel: 'sms'
        };
        ThreadUI.appendMessage(incomingMessage);

        // new checkbox should have been added
        checkboxes =
          ThreadUI.container.querySelectorAll('input[type=checkbox]');
        assert.equal(checkboxes.length, 6);
        assert.equal(checkboxes[2].checked, true);
        assert.equal(checkboxes[5].checked, false);

        // Select all and Deselect all should both be enabled
        assert.isFalse(document.getElementById('messages-check-all-button')
          .hasAttribute('disabled'), 'Check all enabled');
        assert.isFalse(document.getElementById('messages-uncheck-all-button')
          .hasAttribute('disabled'), 'Uncheck all enabled');

        // now delete the selected messages...
        MessageManager.deleteMessage = stub(function(list, itCb) {
          setTimeout(itCb);
        });

        window.confirm = stub(true);

        var getMessageReq = {};
        this.sinon.stub(MessageManager, 'getMessage').returns(getMessageReq);
        getMessageReq.result = incomingMessage;

        setTimeout(function() {
          getMessageReq.onsuccess();
          assert.equal(window.confirm.callCount, 1);
          assert.equal(MessageManager.deleteMessage.callCount, 1);
          assert.equal(MessageManager.deleteMessage.calledWith[0].length, 5);
          assert.equal(ThreadUI.container.querySelectorAll('li').length, 1,
            'correct number of Thread li');
          assert.equal(
            ThreadUI.container.querySelector('#message-9999 p').textContent,
            'Recibidas!');
          done();
        }, 1500); // only the last one is slow. What is blocking?

        ThreadUI.delete();
      });

      test('checkInputs should fire in edit mode', function() {
        ThreadUI.startEdit();

        // now a new message comes in...
        ThreadUI.appendMessage({
          sender: '197746797',
          body: 'Recibidas!',
          delivery: 'received',
          id: 9999,
          timestamp: Date.now(),
          channel: 'sms'
        });

        assert.ok(ThreadUI.checkInputs.called);
      });

      test('checkInputs should not fire in normal mode', function(done) {
        ThreadUI.cancelEdit();
        ThreadUI.checkInputs = stub();

        // now a new message comes in...
        ThreadUI.appendMessage({
          sender: '197746797',
          body: 'Recibidas!',
          delivery: 'received',
          id: 9999,
          timestamp: Date.now(),
          channel: 'sms'
        });

        assert.equal(ThreadUI.checkInputs.callCount, 0);
        done();
      });
    });

    teardown(function() {
      ThreadUI.container.innerHTML = '';
      ThreadUI.checkInputs = _tci;
    });
  });

  suite('URL Links in SMS', function() {
    var Message = {
      id: '987',
      body: 'Hello URL',
      type: 'sms'
    };

    //test
    test('#Test URL in message', function() {
      var messageBody = 'For more details visit' +
      ' Yahoo.com, http://www.df.com' +
      ' or visit faq mail.google.com/mail/help/intl/en/about.html.' +
      ' Also google.com/search?q=long+url+with+queries&sourceid=firefox' +
      ' or \nhttps://secured.web:9080';
      var id = '123456';
      Message.id = id;
      Message.body = messageBody;
      var messageDOM = ThreadUI.buildMessageDOM(Message, false);
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
        'Fourth is google.com/search?q=long+url+with+queries&sourceid=firefox' +
        ' and it comes with queries!');
      assert.equal(anchors[4].dataset.url,
        'https://secured.web:9080',
        'Fifth is https://secured.web:9080, secured and after a line break');
      // The links generated shouldn have 'href'
      var anchorsLength = anchors.length;
      for (var i = 0; i < anchorsLength; i++) {
        assert.equal(anchors[i].href, '');
      }

    });

    test('#Test URL with phone, email in message', function() {
      var messageBody = 'Email at cs@yahoo.com, For more details' +
        ' visit http://www.mozilla.org/en-US/firefox/fx/, www.gmail.com' +
        ' or call 897-890-8907';
      var id = '123457';
      Message.id = id;
      Message.body = messageBody;
      var messageDOM = ThreadUI.buildMessageDOM(Message, false);
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
    });
  });

  suite('EmailAddress Links in SMS', function() {
    var Message = {
      id: '1234',
      body: 'Hello n Welcome',
      type: 'sms'
    };

    //test
    test('#Test EmailAddress in message', function() {
      var messageBody = 'Email abc@gmail.com or myself@my.com,rs@1 ' +
                      'from yahoo.com';
      var id = '123456';
      Message.id = id;
      Message.body = messageBody;
      var messageDOM = ThreadUI.buildMessageDOM(Message, false);
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
    });

    test('#Test with phone numbers, url and email in a message', function() {
      var messageBody = 'Send a text to 729725 (PAYPAL).' +
      ' money@paypal.com hi-there@mail.com,sup.port@efg.com and 35622.00' +
      ' the cs@yahoo.co.in email. www.yahoo.com,payapal.com are urls.' +
      ' You can even enter 995-345-5678 6787897890.';
      var id = '123457';
      Message.id = id;
      Message.body = messageBody;
      var messageDOM = ThreadUI.buildMessageDOM(Message, false);
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
    });
  });

  suite('Phone Links in SMS', function() {
    var Message = {
      id: '123',
      body: 'Hello there',
      type: 'sms'
    };

    //test
    test('#numberWithDash', function() {
      var messageBody = 'Hello there, here are numbers with ' +
                      'dashes 408-746-9721, 4087469721, 7469721';
      var id = '12345';
      Message.id = id;
      Message.body = messageBody;
      var messageDOM = ThreadUI.buildMessageDOM(Message, false);
      var anchors = messageDOM.querySelectorAll('[data-dial]');
      assert.equal(anchors.length, 3,
        '3 Contact handlers are attached for 3 phone numbers in DOM');
      assert.equal(anchors[0].dataset.dial,
        '408-746-9721', 'First number link is 408-746-9721');
      assert.equal(anchors[1].dataset.dial,
        '4087469721', 'Second number is 4087469721');
      assert.equal(anchors[2].dataset.dial,
        '7469721', 'Third number is 7469721');
    });

    test('#complexTest with 7 digit numbers, ip, decimals', function() {
      var messageBody = '995-382-7369 futures to a 4458901 slight' +
        ' 789-7890 rebound +1-556-667-7789 on Wall Street 9953827369' +
        ' on Wednesday, +12343454567 with 55.55 futures +919810137553' +
        ' for the S&P 500 up 0.34 percent, Dow Jones futures up 0.12' +
        ' percent100 futures up 0.51 percent at 0921 GMT.';
      var id = '12346';
      Message.id = id;
      Message.body = messageBody;
      var messageDOM = ThreadUI.buildMessageDOM(Message, false);
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

//     ThreadUI.recipients.push({
//       name: contact.name,
//       phoneNumber: contact.tel[0].value,
//       source: 'contacts'
//     });

//     // Launch an input
//     ThreadUI.input.value = 'Jo quiro';
//     ThreadUI.sendMessage();

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

//     ThreadUI.recipients.push({
//       phoneNumber: '2471'
//     });

//     ThreadUI.input.value = 'Short';
//     ThreadUI.sendMessage();

//     setTimeout(function() {
//       assert.equal(Contacts.findByString.callCount, 0);
//       assert.equal(Contacts.findByPhoneNumber.callCount, 1);
//       assert.equal(MessageManager.send.callCount, 1);
//       assert.equal(
//         MessageManager.send.calledWith[0], ThreadUI.recipients[0]
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
