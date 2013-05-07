/*
  ThreadListUI Tests
*/
'use strict';

require('/shared/js/lazy_loader.js');
require('/shared/js/l10n.js');
require('/shared/js/l10n_date.js');

requireApp('sms/test/unit/mock_contact.js');
requireApp('sms/test/unit/mock_l10n.js');
requireApp('sms/test/unit/mock_navigatormoz_sms.js');

requireApp('sms/js/link_helper.js');
requireApp('sms/js/contacts.js');
requireApp('sms/js/fixed_header.js');
requireApp('sms/js/utils.js');
requireApp('sms/test/unit/utils_mockup.js');
requireApp('sms/test/unit/messages_mockup.js');
requireApp('sms/test/unit/thread_list_mockup.js');
requireApp('sms/js/message_manager.js');
requireApp('sms/js/thread_list_ui.js');
requireApp('sms/js/thread_ui.js');
requireApp('sms/js/waiting_screen.js');
requireApp('sms/js/startup.js');



suite('SMS App Unit-Test', function() {
  function stub(additionalCode, ret) {
    if (additionalCode && typeof additionalCode !== 'function')
      ret = additionalCode;

    var nfn = function() {
      nfn.callCount++;
      nfn.calledWith = [].slice.call(arguments);

      if (typeof additionalCode === 'function')
        additionalCode.apply(this, arguments);

      return ret;
    };
    nfn.callCount = 0;
    return nfn;
  }

  var findByString;
  var nativeMozL10n = navigator.mozL10n;
  var realMozMobileMessage;
  var boundOnHashChange;
  var getContactDetails;

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

    Contacts.findByPhoneNumber = function(tel, callback) {
      // Get the contact
      if (tel === '1977') {
        callback(MockContact.list());
      }
    };

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
    Contacts.findByString = findByString;
    // cleanup
    window.document.body.innerHTML = '';
    window.removeEventListener('hashchange', boundOnHashChange);
  });

  // Let's go with tests!

  // First suite it's related to review Thread-View
  suite('Threads-list', function() {
    var _tci;
    // Setup. We need an async. way due to threads are rendered
    // async.
    setup(function(done) {
      MessageManager.getThreads(ThreadListUI.renderThreads, done);
      _tci = ThreadListUI.checkInputs;
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
        var threadWithContact = document.getElementById('thread_1');
        var contactName =
          threadWithContact.getElementsByClassName('name')[0].innerHTML;
        assert.equal(contactName,
                     'contact-title-text{"name":"Pepito Grillo","n":0}');
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
        document.getElementById('main-wrapper').classList.add('edit');
        // Retrieve all inputs
        var inputs = ThreadListUI.container.getElementsByTagName('input');
        // Activate all inputs
        for (var i = inputs.length - 1; i >= 0; i--) {
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
        for (var i = inputs.length - 1; i >= 0; i--) {
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
        document.getElementById('main-wrapper').classList.add('edit');
        ThreadListUI.toggleCheckedAll(true);

        var checkboxes =
          ThreadListUI.container.querySelectorAll('input[type=checkbox]');
        assert.equal(4,
          [].slice.call(checkboxes).filter(function(i) {
            return i.checked;
          }).length, 'All items should be checked');

        // now a new message comes in for a new thread...
        ThreadListUI.count++;
        ThreadListUI.appendThread({
          participants: ['287138'],
          body: 'Recibidas!',
          id: 9999,
          timestamp: new Date(),
          channel: 'sms'
        });

        checkboxes =
          ThreadListUI.container.querySelectorAll('input[type=checkbox]');

        assert.equal(checkboxes.length, 5);
        assert.equal(ThreadListUI.count, 5, '.count should be in sync');
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
        document.getElementById('main-wrapper').classList.add('edit');
        ThreadListUI.checkInputs = stub();

        ThreadListUI.counter++;
        ThreadListUI.appendThread({
          participants: ['287138'],
          body: 'Recibidas!',
          id: 9999,
          timestamp: new Date(),
          channel: 'sms'
        });

        assert.equal(ThreadListUI.checkInputs.callCount, 1);
        done();
      });

      test('checkInputs should not fire in normal mode', function(done) {
        document.getElementById('main-wrapper').classList.remove('edit');
        ThreadListUI.checkInputs = stub();

        ThreadListUI.counter++;
        ThreadListUI.appendThread({
          participants: ['287138'],
          body: 'Recibidas!',
          id: 9999,
          timestamp: new Date(),
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
      ThreadUI.renderMessages({}, done);
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

        var checkAllButton =
          document.getElementById('messages-check-all-button');
        var uncheckAllButton =
          document.getElementById('messages-uncheck-all-button');

        ThreadUI.checkInputs();
        assert.isTrue(checkAllButton.disabled);
        assert.isFalse(uncheckAllButton.disabled);

        // Deactivate all inputs
        for (var i = inputs.length - 1; i >= 0; i--) {
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
        document.getElementById('main-wrapper').classList.add('edit');
        ThreadUI.toggleCheckedAll(true);

        var checkboxes =
          ThreadUI.container.querySelectorAll('input[type=checkbox]');
        assert.equal(checkboxes.length,
          [].slice.call(checkboxes).filter(function(i) {
            return i.checked;
          }).length, 'All items should be checked');

        // now a new message comes in...
        ThreadUI.appendMessage({
          sender: '197746797',
          body: 'Recibidas!',
          delivery: 'received',
          id: 9999,
          timestamp: new Date(),
          channel: 'sms'
        });

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
        MessageManager.deleteMessages = stub(function(list, itCb) {
          setTimeout(itCb);
        });

        window.confirm = stub(true);

        setTimeout(function() {
          assert.equal(window.confirm.callCount, 1);
          assert.equal(MessageManager.deleteMessages.callCount, 1);
          assert.equal(MessageManager.deleteMessages.calledWith[0].length, 5);
          assert.equal(ThreadUI.container.querySelectorAll('li').length, 1);
          assert.equal(
            ThreadUI.container.querySelector('#message-9999 p').textContent,
            'Recibidas!');

          done();
        }, 1500); // only the last one is slow. What is blocking?

        window.history.back = stub();
        ThreadUI.delete();
      });

      test('checkInputs should fire in edit mode', function(done) {
        document.getElementById('main-wrapper').classList.add('edit');
        ThreadUI.checkInputs = stub();

        // now a new message comes in...
        ThreadUI.appendMessage({
          sender: '197746797',
          body: 'Recibidas!',
          delivery: 'received',
          id: 9999,
          timestamp: new Date(),
          channel: 'sms'
        });

        assert.equal(ThreadUI.checkInputs.callCount, 1);
        done();
      });

      test('checkInputs should not fire in normal mode', function(done) {
        document.getElementById('main-wrapper').classList.remove('edit');
        ThreadUI.checkInputs = stub();

        // now a new message comes in...
        ThreadUI.appendMessage({
          sender: '197746797',
          body: 'Recibidas!',
          delivery: 'received',
          id: 9999,
          timestamp: new Date(),
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

  suite('New layout', function() {

    setup(function() {
      window.location.hash = '#new';
    });

    test('Create editable recipient', function() {
      // Create editable recipient
      ThreadUI.appendEditableRecipient();
      // Is the editable recipient created?
      var editableRecipientsBefore =
        ThreadUI.recipientsContainer.
          querySelectorAll('span[contenteditable=true]');
      assert.equal(editableRecipientsBefore.length, 1);
      // Pick the recipient
      var recipient = editableRecipientsBefore[0];
      // Update the content
      recipient.textContent = '+34612123123;';
      // Launch an input
      recipient.dispatchEvent(new CustomEvent('input'));
      // Check if recipient now it's a box
      var editableRecipientsAfter =
        ThreadUI.recipientsContainer.
          querySelectorAll('span[contenteditable=true]');
      assert.equal(editableRecipientsAfter.length, 0);
      // Convert again in editable recipient
      var nonEditableRecipients =
        ThreadUI.recipientsContainer.
          querySelectorAll('span[contenteditable=false]');
      assert.equal(nonEditableRecipients.length, 1);
      // Convert in editable
      var justCreatedRecipient = nonEditableRecipients[0];
      justCreatedRecipient.
        dispatchEvent(new CustomEvent('click', {'bubbles' : true}));
      // Is editable again?
      var recipientsEditableAgain =
        ThreadUI.recipientsContainer.
          querySelectorAll('span[contenteditable=true]');
      assert.equal(recipientsEditableAgain.length, 1);
      // Clean the content
      recipientsEditableAgain[0].textContent = '';
      ThreadUI.cleanRecipients();
      var recipientsAtTheEnd =
        ThreadUI.recipientsContainer.
          querySelectorAll('span[contenteditable=true]');
      assert.equal(recipientsAtTheEnd.length, 0);

    });

    test('Create recipient live-search', function() {
      var contact = {
            id: 111,
            name: ['Alejandro'],
            tel: [{
              value: '0624710190',
              type: 'Mobile'
            }]
          };
      // Create editable recipient
      ThreadUI.appendEditableRecipient(contact);
      // Retrieve the element
      var recipientsCreated =
        ThreadUI.recipientsContainer.getElementsByClassName('recipient');
      assert.equal(recipientsCreated.length, 1);
      // Pick the recipient
      var recipient = recipientsCreated[0];
      assert.equal(recipient.textContent, 'Alejandro');
    });

    teardown(function() {
      window.location.hash = '';
      ThreadUI.recipientsContainer.textContent = '';
    });
  });

  suite('Secure User Input', function() {
    function mock(definition) {
      return function mock() {
        mock.called = true;
        mock.args = [].slice.call(arguments);
        return definition.apply(this, mock.args);
      };
    }
    suiteSetup(function() {
      getContactDetails = Utils.getContactDetails;
      Utils.getContactDetails = mock(function(number, contacts) {
        return {
          isContact: !!contacts,
          title: number
        };
      });
    });

    suiteTeardown(function() {
      Utils.getContactDetails = getContactDetails;
    });

    test('+99', function(done) {
      var ul = document.createElement('ul');

      ThreadUI.recipients.value = '+99';
      assert.doesNotThrow(function() {
        ThreadUI.renderContact({
          name: 'Spider Monkey',
          tel: [{ value: '...' }]
        }, '+99', ul);
      });
      assert.ok(Utils.getContactDetails.called);
      assert.equal(Utils.getContactDetails.args[0], '...');

      done();
    });

    test('*67 [800]-555-1212', function(done) {
      var ul = document.createElement('ul');

      assert.doesNotThrow(function() {
        ThreadUI.renderContact({
          name: 'Spider Monkey',
          tel: [{ value: '...' }]
        }, '*67 [800]-555-1212', ul);
      });
      assert.ok(Utils.getContactDetails.called);
      assert.equal(Utils.getContactDetails.args[0], '...');

      done();
    });

    test('\\^$*+?.', function(done) {
      var ul = document.createElement('ul');
      assert.doesNotThrow(function() {
        ThreadUI.renderContact({
          name: 'Spider Monkey',
          tel: [{ value: '...' }]
        }, '\\^$*+?.', ul);
      });
      assert.ok(Utils.getContactDetails.called);
      assert.equal(Utils.getContactDetails.args[0], '...');

      done();
    });
  });

  suite('Defensive Contact Rendering', function() {
    test('has tel number', function() {
      var contactsUl = document.createElement('ul');
      var contact = new MockContact();
      assert.isTrue(ThreadUI.renderContact(contact,
        contact.tel[0].value, contactsUl));
    });

    test('no tel number', function() {
      var contactsUl = document.createElement('ul');
      var contact = new MockContact();
      contact.tel = null;
      assert.isFalse(ThreadUI.renderContact(contact, null, contactsUl));
    });
  });

  suite('Sending SMS from new screen', function() {
    test('Sending to contact should put in right thread', function(done) {
      var mock = [
          {
            name: 'Pietje',
            number: '0624710190'
          }
        ];
      Contacts.findByString = stub(function(str, callback) {
        callback(mock);
      });
      Contacts.findByPhoneNumber = stub(function(str, callback) {
        callback(mock);
      });

      MessageManager.onHashChange = stub();
      MessageManager.send = stub();

      window.location.hash = '#new';
      var recipient = ThreadUI.appendEditableRecipient(mock[0]);
      ThreadUI.createRecipient(recipient);
      // Launch an input
      ThreadUI.input.value = 'Jo quiro';
      ThreadUI.sendMessage();

      setTimeout(function() {
        assert.equal(Contacts.findByString.callCount, 0);
        assert.equal(Contacts.findByPhoneNumber.callCount, 1);
        assert.equal(MessageManager.send.callCount, 1);
        assert.equal(MessageManager.send.calledWith[0], '0624710190');
        assert.equal(MessageManager.send.calledWith[1], 'Jo quiro');

        window.location.hash = '';
        done();
      }, 30);
    });

    test('Sending to short nr should not link to contact', function(done) {
      // findByString does a substring find
      Contacts.findByString = stub(function(str, callback) {
        callback([
          {
            id: 111,
            name: ['Pietje'],
            tel: [{
              value: '0624710190',
              type: 'Mobile'
            }]
          }
        ]);
      });
      Contacts.findByPhoneNumber = stub(function(str, callback) {
        callback([]);
      });

      MessageManager.onHashChange = stub();
      MessageManager.send = stub();

      window.location.hash = '#new';
      var recipient = ThreadUI.appendEditableRecipient();
      recipient.textContent = '2471';
      // Launch an input
      ThreadUI.createRecipient(recipient);
      ThreadUI.input.value = 'Short';
      ThreadUI.sendMessage();

      setTimeout(function() {
        assert.equal(Contacts.findByString.callCount, 0);
        assert.equal(Contacts.findByPhoneNumber.callCount, 1);
        assert.equal(MessageManager.send.callCount, 1);
        assert.equal(MessageManager.send.calledWith[0], '2471');
        assert.equal(MessageManager.send.calledWith[1], 'Short');

        window.location.hash = '';
        done();
      }, 30);
    });
  });
});
