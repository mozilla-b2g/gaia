/*global MocksHelper, MockL10n, ThreadUI, MockNavigatormozMobileMessage,
         loadBodyHTML, Compose, MessageManager */

'use strict';

if (typeof GestureDetector === 'undefined') {
  require('/shared/js/gesture_detector.js');
}
require('/shared/test/unit/mocks/mock_gesture_detector.js');

requireApp('sms/test/unit/mock_contact.js');
requireApp('sms/test/unit/mock_l10n.js');
requireApp('sms/test/unit/mock_navigatormoz_sms.js');
requireApp('sms/test/unit/mock_message_manager.js');
requireApp('sms/test/unit/mock_moz_activity.js');
requireApp('sms/test/unit/mock_information.js');
requireApp('sms/js/utils.js');
requireApp('sms/js/settings.js');
requireApp('sms/js/attachment_menu.js');
requireApp('sms/js/compose.js');
requireApp('sms/js/contacts.js');
requireApp('sms/js/recipients.js');
requireApp('sms/js/threads.js');
requireApp('sms/js/message_manager.js');
requireApp('sms/js/thread_list_ui.js');
requireApp('sms/js/thread_ui.js');
requireApp('sms/js/attachment.js');
requireApp('sms/js/fixed_header.js');
requireApp('sms/js/contact_renderer.js');

var mHelperIntegration = new MocksHelper([
  'MessageManager',
  'MozActivity',
  'Information'
]).init();

suite('ThreadUI Integration', function() {
  var realMozL10n;
  var threadUIMozMobileMessage;
  var recipients;
  var children;
  var fixture;
  var sendButton;
  var input;

  mHelperIntegration.attachTestHelpers();

  if (typeof loadBodyHTML === 'undefined') {
    require('/shared/test/unit/load_body_html_helper.js');
  }

  suiteSetup(function() {
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    threadUIMozMobileMessage = ThreadUI._mozMobileMessage;
    ThreadUI._mozMobileMessage = MockNavigatormozMobileMessage;

    loadBodyHTML('/index.html');
    ThreadUI.init();
  });

  suiteTeardown(function() {
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

    setup(function() {
      this.sinon.spy(ThreadUI, 'searchContact');
    });

    test('toFieldInput handler, successful', function() {
      var fakeEvent = {
        target: {
          isPlaceholder: true,
          textContent: 'abc'
        }
      };

      ThreadUI.toFieldInput.call(ThreadUI, fakeEvent);

      sinon.assert.calledOnce(ThreadUI.searchContact);
      sinon.assert.calledWith(ThreadUI.searchContact, 'abc');
    });

    test('toFieldInput handler, unsuccessful', function() {
      var fakeEvent = {
        target: {
          isPlaceholder: true,
          textContent: ''
        }
      };

      ThreadUI.toFieldInput.call(ThreadUI, fakeEvent);

      sinon.assert.called(ThreadUI.searchContact);
      sinon.assert.calledWith(ThreadUI.searchContact, '');

      fakeEvent.target.textContent = 'abd';
      fakeEvent.target.isPlaceholder = false;

      ThreadUI.toFieldInput.call(ThreadUI, fakeEvent);

      assert.isFalse(ThreadUI.searchContact.calledTwice);
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

    test('Typing in list will switch to singline mode', function(done) {
      var toField = ThreadUI.toField;
      var recipientsList = ThreadUI.recipientsList;

      children = recipientsList.children;
      recipients = ThreadUI.recipients;

      // Fill the recipients list with enough recipients to
      // enable the "pan" event
      recipients.add({
        number: '999999999999999999999999999999'
      });

      recipients.add({
        number: '888888888888888888888888888888'
      });

      // Since the offsetHeight is lazily captured during any
      // first event, trigger an event to ensure that the
      // "pan" event will have a height to calculate with.
      //
      toField.click();

      // Simulate list growth
      recipientsList.style.height = '100px';

      // Listen for the pan event, simulated immediately following.
      toField.addEventListener('pan', function panTest() {
        done(function() {
          assert.isTrue(toField.classList.contains('multiline'));

          toField.removeEventListener('pan', panTest, false);

          // Once the pan event has occured, the following steps
          // will simulate the user actions necessary for testing
          // the return to single line mode

          // 1. Enter text into the editable "placeholder"
          children[2].textContent = '0';

          // 2. Trigger a "keyup" event
          children[2].dispatchEvent(
            new CustomEvent('keyup', {
              bubbles: true
            })
          );

          // toField should now be "singleline" again
          assert.isTrue(toField.classList.contains('singleline'));
        });
      });

      // Simulate pan event
      toField.dispatchEvent(
        new CustomEvent('pan', {
          detail: {
            absolute: {
              dy: 1
            }
          }
        })
      );
    });

    test('Clicking in list will switch to singline mode', function(done) {
      var toField = ThreadUI.toField;
      var recipientsList = ThreadUI.recipientsList;

      children = recipientsList.children;
      recipients = ThreadUI.recipients;

      // Fill the recipients list with enough recipients to
      // enable the "multiline" view
      recipients.add({
        number: '999999999999999999999999999999'
      });

      recipients.add({
        number: '888888888888888888888888888888'
      });

      // Simulate list growth
      recipientsList.style.height = '100px';

      // Listen for the pan event, simulated immediately following.
      toField.addEventListener('click', function clickTest() {
        done(function() {
          toField.removeEventListener('click', clickTest, false);

          // toField should now be "singleline" again
          assert.isTrue(toField.classList.contains('singleline'));
        });
      });

      // Artificially set the list to multiline view
      recipients.visible('multiline');

      // Click "anywhere"
      toField.click();
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

    setup(function() {
      window.location.hash = '#new';
    });

    teardown(function() {
      window.location.hash = '';
    });

    test('Assimilate stranded recipients (message input)', function() {

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

      // Simulate input field focus/entry
      input.dispatchEvent(new CustomEvent('focus'));


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

    test('Assimilate stranded recipients (attachButton)', function() {

      ThreadUI.recipients.add({
        number: '777'
      });

      children = ThreadUI.recipientsList.children;
      recipients = ThreadUI.recipients;

      // There are one recipients...
      assert.equal(recipients.length, 1);
      // And two displayed children,
      // (the recipient "avatars" and a
      // placeholder for the next entry)
      assert.equal(children.length, 2);

      assert.ok(is.corresponding(recipients.list[0], children[0], '777'));
      assert.ok(is.placeholder(children[1]));

      // Set text in the placeholder, as if the user has typed
      // something before jumping to the input field
      children[1].textContent = '555';

      // Simulate input field focus/entry
      ThreadUI.attachButton.click();

      // There are now two recipients...
      assert.equal(recipients.length, 2);
      // And three displayed children,
      // (the recipient "avatars" and a
      // placeholder for the next entry)
      assert.equal(children.length, 3);

      assert.ok(is.corresponding(recipients.list[0], children[0], '777'));
      assert.ok(is.corresponding(recipients.list[1], children[1], '555'));
      assert.ok(is.placeholder(children[2]));
    });

    test('Assimilate stranded recipients (sendButton)', function() {
      // To ensure the onSendClick handler will succeed:

      // 1. Add some content to the message
      Compose.append('foo');

      // 2. Create a recipient
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

      // Simulate sendButton click
      ThreadUI.onSendClick();

      // This is asserted differently, since cleanFields has
      // disposed of the recipients, input and attachments.

      assert.ok(MessageManager.sendSMS.called);

      // Ensure that the "unaccepted" recipient was assimilated
      // and included in the recipients list when message was sent
      var calledWith = MessageManager.sendSMS.args[0];
      assert.deepEqual(calledWith[0], ['999', '000']);
      assert.deepEqual(calledWith[1], 'foo');
    });

    /* Bug:909641 test fails on ci
    test('Assimilate stranded recipients (contactPickButton)', function(done) {
      // To ensure the recipient wrapped before picker return:

      // 1. Add some content to the message
      Compose.append('foo');

      // 2. Create a recipient
      ThreadUI.recipients.add({
        number: '111'
      });

      children = ThreadUI.recipientsList.children;
      recipients = ThreadUI.recipients;

      // Set text in the placeholder, as if the user has typed
      // something before jumping to the input field
      children[1].textContent = '222';

      // Simulate contact pick
      ThreadUI.requestContact();

      // Simulate the picker activity success
      setTimeout(function onsuccess() {
        ThreadUI.recipients.add({
          number: '333'
        });

        // There are now three recipients after picker activity success
        assert.equal(recipients.length, 3);
        // And four displayed children,
        // (the recipient "avatars" and a
        // placeholder for the next entry)
        assert.equal(children.length, 4);
        assert.ok(is.corresponding(recipients.list[0], children[0], '111'));
        assert.ok(is.corresponding(recipients.list[1], children[1], '222'));
        assert.ok(is.corresponding(recipients.list[2], children[2], '333'));
        assert.ok(is.placeholder(children[3]));
        done();
      });
    });
   */

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

      // The the ";" has been removed from the
      // recipients list
      assert.equal(
        ThreadUI.recipientsList.children[0].textContent, ''
      );
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

    /**
     * The code in this test works exactly as it should
     * when run as "standalone".
     *
     * The test runner appears to cause a loss of
     * node references that are expected to exist

    test('<delete> removes "known" contact to the left', function() {
      function backspace(target) {
        var doc = target.ownerDocument;
        var view = doc.defaultView;

        var event = doc.createEvent('KeyboardEvent');

        event.initKeyEvent(
          'keypress', true, true, view,
          false, false, false, false,
          KeyEvent.DOM_VK_BACK_SPACE, 0
        );

        target.dispatchEvent(event);

        return event;
      }

      ThreadUI.recipients = new Recipients({
        outer: 'messages-to-field',
        inner: 'messages-recipients-list',
        template: new Template('messages-recipient-tmpl')
      });

      ThreadUI.recipients.add({
        source: 'contacts',
        name: 'Rick',
        number: '99999'
      });

      children = ThreadUI.recipientsList.children;
      recipients = ThreadUI.recipients;

      // Simulate backspace on the current placeholder
      backspace(children[1]);

      // There are no recipients...
      assert.equal(recipients.length, 0);
      // And one displayed placeholder
      assert.equal(children.length, 1);
    });
    */

  });
});
