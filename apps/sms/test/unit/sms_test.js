/*
  ThreadListUI Tests
*/
'use strict';

require('/shared/js/lazy_loader.js');
require('/shared/js/l10n.js');
require('/shared/js/l10n_date.js');

requireApp('sms/test/unit/mock_contact.js');
requireApp('sms/test/unit/mock_l10n.js');

requireApp('sms/js/link_helper.js');
requireApp('sms/js/contacts.js');
requireApp('sms/js/fixed_header.js');
requireApp('sms/js/search_utils.js');
requireApp('sms/js/utils.js');
requireApp('sms/test/unit/utils_mockup.js');
requireApp('sms/test/unit/messages_mockup.js');
requireApp('sms/test/unit/sms_test_html_mockup.js');
requireApp('sms/test/unit/thread_list_mockup.js');
requireApp('sms/js/message_manager.js');
requireApp('sms/js/thread_list_ui.js');
requireApp('sms/js/thread_ui.js');
requireApp('sms/js/waiting_screen.js');
requireApp('sms/js/startup.js');



suite('SMS App Unit-Test', function() {
  var findByString;
  var nativeMozL10n = navigator.mozL10n;

  suiteSetup(function() {
    navigator.mozL10n = MockL10n;
  });

  suiteTeardown(function() {
    navigator.mozL10n = nativeMozL10n;
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

  function createDOM() {
    // We clean previouos stuff at the beginning
    window.document.body.innerHTML = '';

    // Add main wrapper
    var mainWrapper = document.createElement('article');
    mainWrapper.id = 'main-wrapper';

    // ------- Add thread-list view ---------
    var threadList = document.createElement('section');
    threadList.id = 'thread-list';

    // Add elements inside thread-list view

    // Thread-list header
    var threadListHeader = document.createElement('header');
    threadListHeader.innerHTML = renderThreadListHeader();

    // Thread-list container
    var threadsContainer = document.createElement('article');
    threadsContainer.id = 'threads-container';

    // Thread-list fixed-header
    var threadsHeaderContainer = document.createElement('div');
    threadsHeaderContainer.id = 'threads-header-container';

    // threads-no-messages
    var noMessages = document.createElement('div');
    noMessages.id = 'threads-no-messages';

    // Thread-list Edit form
    var threadListEditForm = document.createElement('form');
    threadListEditForm.id = 'threads-edit-form';
    threadListEditForm.setAttribute('role', 'dialog');
    threadListEditForm.dataset.type = 'edit';
    threadListEditForm.innerHTML = renderThreadListEdit();
    // Append all elemnts to thread-list view
    threadList.appendChild(threadListHeader);
    threadList.appendChild(threadsContainer);
    threadList.appendChild(threadsHeaderContainer);
    threadList.appendChild(noMessages);
    threadList.appendChild(threadListEditForm);

    // Adding to DOM the Thread-list view
    mainWrapper.appendChild(threadList);

    // --------- Add thread-messages (bubbles) view ---------
    var threadMessages = document.createElement('section');
    threadMessages.id = 'thread-messages';

    // Thread-messages main header
    var threadMsgHeader = document.createElement('header');
    threadMsgHeader.innerHTML = renderThreadMsgHeader();

    // Thread-messages sub-header
    var threadMsgSubHeader = document.createElement('div');
    threadMsgSubHeader.id = 'contact-carrier';

    // Thread-messages container
    var threadMsgContainer = document.createElement('article');
    threadMsgContainer.id = 'messages-container';

    // Thread-messages edit form
    var threadMsgEditForm = document.createElement('form');
    threadMsgEditForm.id = 'messages-edit-form';
    threadMsgEditForm.innerHTML = renderThreadMsgEdit();

    // Thread-messages input form
    var threadMsgInputForm = document.createElement('form');
    threadMsgInputForm.id = 'messages-compose-form';
    threadMsgInputForm.innerHTML = renderThreadMsgInputBar();

    threadMessages.appendChild(threadMsgHeader);
    threadMessages.appendChild(threadMsgSubHeader);
    threadMessages.appendChild(threadMsgContainer);
    threadMessages.appendChild(threadMsgEditForm);
    threadMessages.appendChild(threadMsgInputForm);

    // Adding to DOM the Thread-messages view
    mainWrapper.appendChild(threadMessages);

    // --------- Loading screen ---------
    var loadingScreen = document.createElement('article');
    loadingScreen.id = 'loading';

    // At the end we add all elements to document
    window.document.body.appendChild(mainWrapper);
    window.document.body.appendChild(loadingScreen);
  }

  // Previous setup
  suiteSetup(function() {
    findByString = Contacts.findByString;

    // We mockup the method for retrieving the threads
    MessageManager.getThreads = function(callback, extraArg) {
      var threadsMockup = new MockThreadList();
      callback(threadsMockup, extraArg);
    };

    MessageManager.getMessages = function(options, callback) {

      var stepCB = options.stepCB, // CB which manage every message
        filter = options.filter, // mozMessageFilter
        invert = options.invert, // invert selection
        endCB = options.endCB,   // CB when all messages retrieved
        endCBArgs = options.endCBArgs; //Args for endCB

      var messagesMockup = new MockThreadMessages();
      for (var i = 0, l = messagesMockup.length; i < l; i++) {
        stepCB(messagesMockup[i]);
      }
      endCB(endCBArgs);
    };

    // We mockup the method for retrieving the info
    // of a contact given a number
    Contacts.findByString = function(tel, callback) {
      // Get the contact
      if (tel === '1977') {
        callback(MockContact.list());
      }
    };

    // Create DOM structure
    createDOM();

    // Clear if necessary...
    if (ThreadUI.container) {
      ThreadUI.container.innerHTML = '';
    }

    // ...And render
    ThreadUI.init();
    ThreadListUI.init();
    window.addEventListener(
      'hashchange', MessageManager.onHashChange.bind(MessageManager)
    );
  });

  suiteTeardown(function() {
    Contacts.findByString = findByString;
  });


  // Let's go with tests!

  // First suite it's related to review Thread-View
  suite('Threads-list', function() {
    // Setup. We need an async. way due to threads are rendered
    // async.
    setup(function(done) {
      MessageManager.getThreads(ThreadListUI.renderThreads, done);
    });
    // We are gonna review the HTML structure with this suite
    suite('Threads-list rendering', function() {

      test('Check HTML structure', function() {
        // Check the HTML structure, and if it fits with Building Blocks

        var container = ThreadListUI.container;

        // Given our mockup, we should have 4 grous UL/HEADER
        assertNumberOfElementsInContainerByTag(container, 3, 'ul');
        assertNumberOfElementsInContainerByTag(container, 3, 'header');

        // We know as well that we have, in total, 5 threads
        assertNumberOfElementsInContainerByTag(container, 4, 'li');
        assertNumberOfElementsInContainerByTag(container, 4, 'a');

        // In our mockup we shoul group the threads following day criteria
        // In the second group, we should have 2 threads
        var date = getMockupedDate(2);
        var threadsContainer =
          document.getElementById('threadsContainer_' +
            Utils.getDayDate(date.getTime()));
        assertNumberOfElementsInContainerByTag(threadsContainer, 2, 'li');
      });

      test('Render unread style properly', function() {
        // We know that only one thread is unread
        assertNumOfElementsByClass(ThreadListUI.container, 1, 'unread');
      });

      test('Update thread with contact info', function() {
        // Given a number, we should retrieve the contact and update the info
        var threadWithContact = document.getElementById('thread_1977');
        var contactName =
          threadWithContact.getElementsByClassName('name')[0].innerHTML;
        assert.equal(contactName, 'Pepito Grillo');
      });
    });

    // Review the edit-mode functionality and markup
    suite('Threads-list edit mode', function() {

      test('Check edit mode form', function() {
        var container = ThreadListUI.container;
        // Do we have all inputs ready?
        assertNumberOfElementsInContainerByTag(container, 4, 'input');
      });

      test('Select all/Deselect All buttons', function() {
        // Retrieve all inputs
        var inputs = ThreadListUI.container.getElementsByTagName('input');
        // Activate all inputs
        for (var i = inputs.length - 1; i >= 0; i--) {
          inputs[i].checked = true;
          ThreadListUI.clickInput(inputs[i]);
        }
        ThreadListUI.checkInputs();
        assert.isTrue(document.getElementById('threads-check-all-button')
          .classList.contains('disabled'));
        assert.isFalse(document.getElementById('threads-uncheck-all-button')
          .classList.contains('disabled'));
        // Deactivate all inputs
        for (var i = inputs.length - 1; i >= 0; i--) {
          inputs[i].checked = false;
          ThreadListUI.clickInput(inputs[i]);
        }
        ThreadListUI.checkInputs();
        assert.isFalse(document.getElementById('threads-check-all-button')
          .classList.contains('disabled'));
        assert.isTrue(document.getElementById('threads-uncheck-all-button')
          .classList.contains('disabled'));
        // Activate only one
        inputs[0].checked = true;
        ThreadListUI.clickInput(inputs[0]);
        ThreadListUI.checkInputs();
        assert.isFalse(document.getElementById('threads-check-all-button')
          .classList.contains('disabled'));
        assert.isFalse(document.getElementById('threads-uncheck-all-button')
          .classList.contains('disabled'));
      });
    });

    teardown(function() {
      ThreadListUI.container.innerHTML = '';
    });
  });

  // Suite for reviewing Thread-view ("bubbles" view)
  suite('Messages given a thread', function() {
    // Setup for getting all messages rendered before every test
    setup(function(done) {
      ThreadUI.renderMessages({}, done);
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

      test('Check input form & send button', function() {
        ThreadUI.enableSend();
        // At the begginning it should be disabled
        assert.isTrue(ThreadUI.sendButton.disabled);
        // If we type some text in a thread
        ThreadUI.input.value = 'Hola';
        ThreadUI.enableSend();
        assert.isFalse(ThreadUI.sendButton.disabled);
        // We change to 'new'
        window.location.hash = '#new';
        ThreadUI.enableSend();
        // In '#new' I need the contact as well, so it should be disabled
        assert.isTrue(ThreadUI.sendButton.disabled);
        // Adding a contact should enable the button
        ThreadUI.recipient.value = '123123123';
        ThreadUI.enableSend();
        assert.isFalse(ThreadUI.sendButton.disabled);
        // Finally we clean the form
        ThreadUI.cleanFields();
        assert.isTrue(ThreadUI.sendButton.disabled);
      });
    });

    suite('Thread-messages Edit mode (bubbles view)', function() {
      // Setup for getting all messages rendered before every test
      setup(function(done) {
        ThreadUI.renderMessages({}, function() {
          done();
        });
      });

      test('Check edit mode form', function() {
        assertNumberOfElementsInContainerByTag(ThreadUI.container, 5, 'input');
      });

      test('Select/Deselect all', function() {
        var inputs = ThreadUI.container.getElementsByTagName('input');
        // Activate all inputs
        for (var i = inputs.length - 1; i >= 0; i--) {
          inputs[i].checked = true;
          ThreadUI.chooseMessage(inputs[i]);
        }
        ThreadUI.checkInputs();
        assert.isTrue(document.getElementById('messages-check-all-button')
          .classList.contains('disabled'));
        assert.isFalse(document.getElementById('messages-uncheck-all-button')
          .classList.contains('disabled'));
        // Deactivate all inputs
        for (var i = inputs.length - 1; i >= 0; i--) {
          inputs[i].checked = false;
          ThreadUI.chooseMessage(inputs[i]);
        }
        ThreadUI.checkInputs();
        assert.isFalse(document.getElementById('messages-check-all-button')
          .classList.contains('disabled'));
        assert.isTrue(document.getElementById('messages-uncheck-all-button')
          .classList.contains('disabled'));
        // Activate only one
        inputs[0].checked = true;
        ThreadUI.chooseMessage(inputs[0]);
        ThreadUI.checkInputs();
        assert.isFalse(document.getElementById('messages-check-all-button')
          .classList.contains('disabled'));
        assert.isFalse(document.getElementById('messages-uncheck-all-button')
          .classList.contains('disabled'));
      });
    });

    teardown(function() {
      ThreadUI.container.innerHTML = '';
    });
  });

  suite('URL Links in SMS', function() {
    var Message = {
      id: '987',
      body: 'Hello URL'
    };

    //test
    test('#Test URL in message', function() {
      var messageBody = 'For more details visit' +
      ' Yahoo.com, http://www.df.com' +
      ' or visit faq mail.google.com/mail/help/intl/en/about.html';
      var id = '123456';
      Message.id = id;
      Message.body = messageBody;
      var messageDOM = ThreadUI.buildMessageDOM(Message, false);
      var anchors = messageDOM.querySelectorAll('[data-url]');
      assert.equal(anchors.length, 3,
        '3 URLs are tappable in message');
      assert.equal(anchors[0].dataset.url,
        'http://Yahoo.com', 'First url is http://Yahoo.com');
      assert.equal(anchors[1].dataset.url,
        'http://www.df.com', 'Second url is http://www.df.com');
      assert.equal(anchors[2].dataset.url,
        'http://mail.google.com/mail/help/intl/en/about.html',
         'Second url is http://mail.google.com/mail/help/intl/en/about.html');

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
    });
  });

  suite('EmailAddress Links in SMS', function() {
    var Message = {
      id: '1234',
      body: 'Hello n Welcome'
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
    });
  });

  suite('Phone Links in SMS', function() {
    var Message = {
      id: '123',
      body: 'Hello there'
    };

    //test
    test('#numberWithDash', function() {
      var messageBody = 'Hello there, here are numbers with ' +
                      'dashes 408-746-9721, 4087469721, 7469721';
      var id = '12345';
      Message.id = id;
      Message.body = messageBody;
      var messageDOM = ThreadUI.buildMessageDOM(Message, false);
      var anchors = messageDOM.querySelectorAll('[data-phonenumber]');
      assert.equal(anchors.length, 3,
        '3 Contact handlers are attached for 3 phone numbers in DOM');
      assert.equal(anchors[0].dataset.phonenumber,
        '408-746-9721', 'First number is 408-746-9721');
      assert.equal(anchors[1].dataset.phonenumber,
        '4087469721', 'Second number is 4087469721');
      assert.equal(anchors[2].dataset.phonenumber,
        '7469721', 'Third number is 7469721');
    });

    test('#complexTest with 7 digit numbers, ip, decimals', function() {
      var messageBody = '995-382-7369 futures to a 4458901 slight' +
        ' 789-7890 rebound +1-556-667-7789 on Wall Street 9953827369' +
        ' on Wednesday, +12343454567 with 55.55.55 futures +919810137553' +
        ' for the S&P 500 up 0.34 percent, Dow Jones futures up 0.12' +
        ' percent100 futures up 0.51 percent at 0921 GMT.';
      var id = '12346';
      Message.id = id;
      Message.body = messageBody;
      var messageDOM = ThreadUI.buildMessageDOM(Message, false);
      var anchors = messageDOM.querySelectorAll('[data-phonenumber]');
      assert.equal(anchors.length, 7,
        '7 Contact handlers are attached for 7 phone numbers in DOM');
      assert.equal(anchors[0].dataset.phonenumber,
        '995-382-7369', 'First number is 995-382-7369');
      assert.equal(anchors[1].dataset.phonenumber,
        '4458901', 'Second number is 4458901');
      assert.equal(anchors[2].dataset.phonenumber,
        '789-7890', 'Third number is 789-7890');
      assert.equal(anchors[3].dataset.phonenumber,
        '+1-556-667-7789', 'Fourth number is +1-556-667-7789');
      assert.equal(anchors[4].dataset.phonenumber,
        '9953827369', 'Fourth number is 9953827369');
      assert.equal(anchors[5].dataset.phonenumber,
        '+12343454567', 'Fifth number is +12343454567');
      assert.equal(anchors[6].dataset.phonenumber,
        '+919810137553', 'Sixth number is +919810137553');
    });
  });
});
