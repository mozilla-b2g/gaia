requireApp('communications/dialer/js/dialer.js', function() {
  window.removeEventListener('load', dialerStartup);
});

suite('navigation bar', function() {
  var domOptionRecents;
  var domOptionContacts;
  var domOptionKeypad;
  var domViews;

  setup(function() {
    domViews = document.createElement('section');
    domViews.id = 'views';
    document.body.appendChild(domViews);

    domOptionRecents = document.createElement('a');
    domOptionRecents.id = 'option-recents';
    domViews.appendChild(domOptionRecents);

    domOptionContacts = document.createElement('a');
    domOptionContacts.id = 'option-contacts';
    domViews.appendChild(domOptionContacts);

    domOptionKeypad = document.createElement('a');
    domOptionKeypad.id = 'option-keypad';
    domViews.appendChild(domOptionKeypad);

    domViews = document.getElementById('views');

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
});
