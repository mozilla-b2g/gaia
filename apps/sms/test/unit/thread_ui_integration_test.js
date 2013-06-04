'use strict';

if (typeof GestureDetector === 'undefined') {
  require('/shared/js/gesture_detector.js');
}
requireApp('system/test/unit/mock_gesture_detector.js');

requireApp('sms/test/unit/mock_contact.js');
requireApp('sms/test/unit/mock_l10n.js');
requireApp('sms/test/unit/mock_navigatormoz_sms.js');
requireApp('sms/js/utils.js');
requireApp('sms/js/attachment_menu.js');
requireApp('sms/js/compose.js');
requireApp('sms/js/contacts.js');
requireApp('sms/js/recipients.js');
requireApp('sms/js/threads.js');
requireApp('sms/js/message_manager.js');
requireApp('sms/js/thread_list_ui.js');
requireApp('sms/js/thread_ui.js');


suite('ThreadUI Integration', function() {
  var realContacts;
  var getContactDetails;
  var realMozL10n;
  var threadUIMozMobileMessage;
  var recipients;
  var recipient;
  var children;
  var fixture;
  var container;
  var sendButton;
  var input;


  if (typeof loadBodyHTML === 'undefined') {
    require('/shared/test/unit/load_body_html_helper.js');
  }

  suiteSetup(function() {
    realContacts = Contacts;

    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    threadUIMozMobileMessage = ThreadUI._mozMobileMessage;
    ThreadUI._mozMobileMessage = MockNavigatormozMobileMessage;

    loadBodyHTML('/index.html');
    ThreadUI.init();
  });

  suiteTeardown(function() {
    Contacts = realContacts;
    navigator.mozL10n = realMozL10n;
    ThreadUI._mozMobileMessage = threadUIMozMobileMessage;
  });

  setup(function() {

    ThreadUI._mozMobileMessage = MockNavigatormozMobileMessage;

    sendButton = document.getElementById('messages-send-button');
    input = document.getElementById('messages-input');

    fixture = {
      name: 'foo',
      number: '999',
      email: 'a@b.com',
      source: 'none',
      // Mapped to node attr, not true boolean
      editable: 'true'
    };


    ThreadUI.recipients = null;
    ThreadUI.initRecipients();
  });

  teardown(function() {
    recipients = null;
    fixture = null;
  });

  suite('Search Contact Events', function() {
    var realSearchContact;

    setup(function() {
      realSearchContact = ThreadUI.searchContact;

      ThreadUI.searchContact = function(filterValue) {
        ThreadUI.searchContact.called++;
        ThreadUI.searchContact.calledWith = filterValue;
      };
      ThreadUI.searchContact.called = 0;
      ThreadUI.searchContact.calledWith = '';
    });

    teardown(function() {
      realSearchContact = ThreadUI.searchContact;
    });

    test('toFieldInput handler, successful', function() {
      var fakeEvent = {
        target: {
          isPlaceholder: true,
          textContent: 'abc'
        }
      };

      ThreadUI.toFieldInput.call(ThreadUI, fakeEvent);

      assert.equal(ThreadUI.searchContact.called, 1);
      assert.equal(ThreadUI.searchContact.calledWith, 'abc');
    });

    test('toFieldInput handler, unsuccessful', function() {
      var fakeEvent = {
        target: {
          isPlaceholder: true,
          textContent: ''
        }
      };

      ThreadUI.toFieldInput.call(ThreadUI, fakeEvent);

      assert.equal(ThreadUI.searchContact.called, 1);
      assert.equal(ThreadUI.searchContact.calledWith, '');

      fakeEvent.target.textContent = 'abd';
      fakeEvent.target.isPlaceholder = false;

      ThreadUI.toFieldInput.call(ThreadUI, fakeEvent);

      assert.equal(ThreadUI.searchContact.called, 1);
      assert.equal(ThreadUI.searchContact.calledWith, '');
    });
  });

  suite('Recipient List Display', function() {
    test('Always begins in singleline mode', function() {

      // Assert initial state: #messages-recipients-list is singleline
      assert.isFalse(
        ThreadUI.recipientsList.classList.contains('multiline')
      );
      assert.isTrue(
        ThreadUI.recipientsList.classList.contains('singleline')
      );

      // Modify state
      ThreadUI.recipients.visible('multiline');

      // Assert modified state: #messages-recipients-list is multiline
      assert.isTrue(
        ThreadUI.recipientsList.classList.contains('multiline')
      );
      assert.isFalse(
        ThreadUI.recipientsList.classList.contains('singleline')
      );

      // Reset state
      ThreadUI.initRecipients();

      // Assert initial/reset state: #messages-recipients-list is singleline
      assert.isFalse(
        ThreadUI.recipientsList.classList.contains('multiline')
      );
      assert.isTrue(
        ThreadUI.recipientsList.classList.contains('singleline')
      );
    });
  });

  suite('Recipient Input Behaviours', function() {
    var is = {
      corresponding: function(recipient, avatar, value) {
        return is.recipient(recipient, value) &&
          is.avatar(avatar, value);
      },
      recipient: function(candidate, value) {
        return (candidate.name === value || candidate.number === value);
      },
      avatar: function(candidate, value) {
        return !is.placeholder(candidate) &&
          !is.editable(candidate) && candidate.textContent.trim() === value;
      },
      placeholder: function(candidate, opts) {
        opts = opts || { isEmpty: true };
        return candidate.isPlaceholder &&
          ((opts.isEmpty && candidate.textContent.trim() === '') || true);
      },
      editable: function(candidate) {
        return candidate.contentEditable === false;
      }
    };

    test('Captures stranded recipients', function() {

      ThreadUI.recipients.add({
        number: '999'
      });

      children = ThreadUI.recipientsList.children;
      recipients = ThreadUI.recipients;

      // There are one recipients...
      assert.equal(recipients.length, 1);
      // And two displayed children,
      // (the recipient "avatars" and a
      // placeholder for the next entry)
      assert.equal(children.length, 2);

      assert.ok(is.corresponding(recipients.list[0], children[0], '999'));
      assert.ok(is.placeholder(children[1]));

      // Set text in the placeholder, as if the user has typed
      // something before jumping to the input field
      children[1].textContent = '000';

      // Simulate toField blur event.
      ThreadUI.toField.dispatchEvent(new CustomEvent('blur'));

      // There are now two recipients...
      assert.equal(recipients.length, 2);
      // And three displayed children,
      // (the recipient "avatars" and a
      // placeholder for the next entry)
      assert.equal(children.length, 3);

      assert.ok(is.corresponding(recipients.list[0], children[0], '999'));
      assert.ok(is.corresponding(recipients.list[1], children[1], '000'));
      assert.ok(is.placeholder(children[2]));
    });

    test('Lone ";" are not recipients', function() {


      children = ThreadUI.recipientsList.children;
      recipients = ThreadUI.recipients;

      // Set ";" in the placeholder, as if the user has typed
      children[0].textContent = ';';

      // Simulate input field focus/entry
      input.click();

      // There are no recipients...
      assert.equal(recipients.length, 0);
      // And one displayed child...
      assert.equal(children.length, 1);
    });


    test('Taps on in-progress recipients do nothing special', function() {

      children = ThreadUI.recipientsList.children;
      recipients = ThreadUI.recipients;

      // Set text in the placeholder, as if the user has typed
      children[0].textContent = '9999999999';

      // Simulate a tap on the placeholder
      children[0].click();

      // There should be no recipients created
      assert.equal(recipients.length, 0);

      // And only the placeholder is displayed
      assert.equal(children.length, 1);
      assert.isTrue(children[0].isPlaceholder);
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

    teardown(function() {
      ThreadUI.recipients.length = 0;
    });

    test('+99', function() {
      var ul = document.createElement('ul');

      ThreadUI.recipients.add({
        number: '+99'
      });

      assert.doesNotThrow(function() {
        ThreadUI.renderContact({
          name: 'Spider Monkey',
          tel: [{ value: '...' }]
        }, '+99', ul);
      });

      assert.ok(Utils.getContactDetails.called);
      assert.equal(Utils.getContactDetails.args[0], '...');
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
});
