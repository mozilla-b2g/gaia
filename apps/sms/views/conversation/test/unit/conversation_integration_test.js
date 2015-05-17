/*global MocksHelper, MockL10n, ConversationView,
         loadBodyHTML, Compose, MessageManager, Navigation */

'use strict';

if (typeof GestureDetector === 'undefined') {
  require('/shared/js/gesture_detector.js');
}
require('/shared/js/event_dispatcher.js');
require('/shared/test/unit/mocks/mock_gesture_detector.js');
require('/shared/test/unit/mocks/mock_l10n.js');

require('/views/shared/test/unit/mock_contact.js');
require('/services/test/unit/mock_message_manager.js');
require('/views/shared/test/unit/mock_moz_activity.js');
require('/views/shared/test/unit/mock_information.js');
require('/views/shared/test/unit/mock_activity_handler.js');
require('/views/shared/test/unit/mock_navigation.js');
require('/views/shared/js/utils.js');
require('/views/shared/js/settings.js');
require('/views/conversation/js/subject_composer.js');
require('/views/conversation/js/compose.js');
require('/views/shared/js/contacts.js');
require('/views/conversation/js/recipients.js');
require('/services/js/threads.js');
require('/views/inbox/js/inbox.js');
require('/views/conversation/js/conversation.js');
require('/views/conversation/js/attachment.js');
require('/views/shared/js/contact_renderer.js');
require('/views/shared/js/navigation.js');

var mHelperIntegration = new MocksHelper([
  'MessageManager',
  'MozActivity',
  'Information',
  'ActivityHandler',
  'Navigation'
]).init();

suite('ConversationView Integration', function() {
  var realMozL10n;
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

    loadBodyHTML('/index.html');
    Navigation.init();
    ConversationView.init();
  });

  suiteTeardown(function() {
    navigator.mozL10n = realMozL10n;
  });

  setup(function() {

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


    ConversationView.recipients = null;
    ConversationView.initRecipients();
  });

  teardown(function() {
    recipients = null;
    fixture = null;
  });

  suite('Search Contact Events', function() {

    setup(function() {
      this.sinon.spy(ConversationView, 'searchContact');
    });

    test('toFieldInput handler, successful', function() {
      var fakeEvent = {
        target: {
          isPlaceholder: true,
          textContent: 'abc'
        }
      };

      ConversationView.toFieldInput.call(ConversationView, fakeEvent);

      sinon.assert.calledOnce(ConversationView.searchContact);
      sinon.assert.calledWith(ConversationView.searchContact, 'abc');
    });

    test('toFieldInput handler, unsuccessful', function() {
      var fakeEvent = {
        target: {
          isPlaceholder: true,
          textContent: ''
        }
      };

      ConversationView.toFieldInput.call(ConversationView, fakeEvent);

      sinon.assert.called(ConversationView.searchContact);
      sinon.assert.calledWith(ConversationView.searchContact, '');

      fakeEvent.target.textContent = 'abd';
      fakeEvent.target.isPlaceholder = false;

      ConversationView.toFieldInput.call(ConversationView, fakeEvent);

      assert.isFalse(ConversationView.searchContact.calledTwice);
    });
  });

  suite('Recipient List Display', function() {
    test('Always begins in singleline mode', function() {

      // Assert initial state: #messages-recipients-list is singleline
      assert.isFalse(
        ConversationView.recipientsList.classList.contains('multiline')
      );
      assert.isTrue(
        ConversationView.recipientsList.classList.contains('singleline')
      );

      // Modify state
      ConversationView.recipients.visible('multiline');

      // Assert modified state: #messages-recipients-list is multiline
      assert.isTrue(
        ConversationView.recipientsList.classList.contains('multiline')
      );
      assert.isFalse(
        ConversationView.recipientsList.classList.contains('singleline')
      );

      // Reset state
      ConversationView.initRecipients();

      // Assert initial/reset state: #messages-recipients-list is singleline
      assert.isFalse(
        ConversationView.recipientsList.classList.contains('multiline')
      );
      assert.isTrue(
        ConversationView.recipientsList.classList.contains('singleline')
      );
    });

    test('Typing in list will switch to singline mode', function(done) {
      var toField = ConversationView.toField;
      var recipientsList = ConversationView.recipientsList;

      children = recipientsList.children;
      recipients = ConversationView.recipients;

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
      var toField = ConversationView.toField;
      var recipientsList = ConversationView.recipientsList;

      children = recipientsList.children;
      recipients = ConversationView.recipients;

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
      this.sinon.stub(Navigation, 'isCurrentPanel').returns(false);
      Navigation.isCurrentPanel.withArgs('composer').returns(true);

      this.sinon.stub(MessageManager, 'sendSMS');
    });

    test('Assimilate stranded recipients (message input)', function() {

      ConversationView.recipients.add({
        number: '999'
      });

      children = ConversationView.recipientsList.children;
      recipients = ConversationView.recipients;

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

      ConversationView.recipients.add({
        number: '777'
      });

      children = ConversationView.recipientsList.children;
      recipients = ConversationView.recipients;

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
      document.getElementById('messages-attach-button').click();

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
      ConversationView.recipients.add({
        number: '999'
      });


      children = ConversationView.recipientsList.children;
      recipients = ConversationView.recipients;

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
      ConversationView.onSendClick();
      ConversationView.simSelectedCallback(undefined, 0);

      // Ensure that the "unaccepted" recipient was assimilated
      // and included in the recipients list when message was sent
      sinon.assert.calledWithMatch(MessageManager.sendSMS, {
        recipients: ['999', '000'],
        content: 'foo'
      });
    });

    /* Bug:909641 test fails on ci
    test('Assimilate stranded recipients (contactPickButton)', function(done) {
      // To ensure the recipient wrapped before picker return:

      // 1. Add some content to the message
      Compose.append('foo');

      // 2. Create a recipient
      ConversationView.recipients.add({
        number: '111'
      });

      children = ConversationView.recipientsList.children;
      recipients = ConversationView.recipients;

      // Set text in the placeholder, as if the user has typed
      // something before jumping to the input field
      children[1].textContent = '222';

      // Simulate contact pick
      ConversationView.requestContact();

      // Simulate the picker activity success
      setTimeout(function onsuccess() {
        ConversationView.recipients.add({
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


      children = ConversationView.recipientsList.children;
      recipients = ConversationView.recipients;

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
        ConversationView.recipientsList.children[0].textContent, ''
      );
    });

    test('Taps on in-progress recipients do nothing special', function() {

      children = ConversationView.recipientsList.children;
      recipients = ConversationView.recipients;

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

      ConversationView.recipients = new Recipients({
        outer: 'messages-to-field',
        inner: 'messages-recipients-list',
        template: new Template('messages-recipient-tmpl')
      });

      ConversationView.recipients.add({
        source: 'contacts',
        name: 'Rick',
        number: '99999'
      });

      children = ConversationView.recipientsList.children;
      recipients = ConversationView.recipients;

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
