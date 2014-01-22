'use strict';

/* global NavbarManager */

requireApp('communications/dialer/js/dialer.js');

suite('navigation bar', function() {
  var domContactsIframe;
  var domOptionRecents;
  var domOptionContacts;
  var domOptionKeypad;
  var domViews;

  setup(function() {
    domViews = document.createElement('section');
    domViews.id = 'views';

    domOptionRecents = document.createElement('a');
    domOptionRecents.id = 'option-recents';
    domViews.appendChild(domOptionRecents);

    domOptionContacts = document.createElement('a');
    domOptionContacts.id = 'option-contacts';
    domViews.appendChild(domOptionContacts);

    domOptionKeypad = document.createElement('a');
    domOptionKeypad.id = 'option-keypad';
    domViews.appendChild(domOptionKeypad);

    domContactsIframe = document.createElement('iframe');
    domContactsIframe.id = 'iframe-contacts';
    domOptionContacts.appendChild(domContactsIframe);

    document.body.appendChild(domViews);

    NavbarManager.init();
  });

  teardown(function() {
    document.body.removeChild(domViews);
  });

  suite('> show / hide', function() {
    test('NavbarManager.hide() should hide navbar', function() {
      NavbarManager.hide();

      assert.isTrue(domViews.classList.contains('hide-toolbar'));
    });

    test('NavbarManager.show() should show navbar', function() {
      NavbarManager.show();

      assert.isFalse(domViews.classList.contains('hide-toolbar'));
    });
  });

  suite('Second tap on contacts tab', function() {
    test('Listens to click events', function() {
      this.sinon.spy(domOptionContacts, 'addEventListener');
      NavbarManager.init();
      sinon.assert.calledWith(domOptionContacts.addEventListener, 'click',
                              NavbarManager.contactsTabTap);
    });

    suite('contactsTabTap', function() {
      teardown(function() {
        window.location.hash = '';
      });

      test('only works when it is a second tap', function() {
        NavbarManager.contactsTabTap();
        assert.isFalse(
          domContactsIframe.src.contains('/contacts/index.html#home')
        );
      });

      test('goes to home list', function() {
        window.location.hash = '#contacts-view';
        NavbarManager.contactsTabTap();
        assert.isTrue(
          domContactsIframe.src.contains('/contacts/index.html#home')
        );
      });
    });
  });
});
