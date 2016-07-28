'use strict';

/* global MockAccessibilityHelper, MocksHelper, Navigation */

require('/dialer/test/unit/mock_call_log.js');

require('/shared/test/unit/mocks/mock_accessibility_helper.js');

require('/dialer/js/navigation.js');

var mocksHelperForNavigation = new MocksHelper([
  'AccessibilityHelper',
  'CallLog'
]).init();

suite('navigation bar', function() {
  var domKeypadPanel;
  var domRecentsPanel;
  var domIframeContactsContainer;
  var domContactsIframe;
  var domOptionRecents;
  var domOptionContacts;
  var domOptionKeypad;
  var domViews;

  mocksHelperForNavigation.attachTestHelpers();

  setup(function() {
    domKeypadPanel = document.createElement('div');
    domKeypadPanel.id = 'keypad-panel';
    domKeypadPanel.style.visibility = 'hidden';
    document.body.appendChild(domKeypadPanel);

    domIframeContactsContainer = document.createElement('div');
    domIframeContactsContainer.id = 'iframe-contacts-container';
    domIframeContactsContainer.style.visibility = 'hidden';
    document.body.appendChild(domIframeContactsContainer);

    domContactsIframe = document.createElement('iframe');
    domContactsIframe.id = 'iframe-contacts';
    domIframeContactsContainer.appendChild(domContactsIframe);

    domRecentsPanel = document.createElement('div');
    domRecentsPanel.id = 'recents-panel';
    domRecentsPanel.style.visibility = 'hidden';
    document.body.appendChild(domRecentsPanel);

    domViews = document.createElement('section');
    domViews.id = 'views';

    domOptionRecents = document.createElement('a');
    domOptionRecents.id = 'option-recents';
    domOptionRecents.dataset.destination = 'recents';
    domViews.appendChild(domOptionRecents);

    domOptionContacts = document.createElement('a');
    domOptionContacts.id = 'option-contacts';
    domOptionContacts.dataset.destination = 'contacts';
    domViews.appendChild(domOptionContacts);

    domOptionKeypad = document.createElement('a');
    domOptionKeypad.id = 'option-keypad';
    domOptionKeypad.dataset.destination = 'keypad';
    domViews.appendChild(domOptionKeypad);

    document.body.appendChild(domViews);
  });

  teardown(function() {
    document.body.removeChild(domKeypadPanel);
    document.body.removeChild(domRecentsPanel);
    document.body.removeChild(domIframeContactsContainer);
    document.body.removeChild(domViews);
  });

  suite('Navigation', function() {
    suite('show()', function() {
      setup(function() {
        this.sinon.spy(MockAccessibilityHelper, 'setAriaSelected');
      });

      test('throws when given an invalid destination', function() {
        try {
          Navigation.show('unknown');
          assert.isTrue(false, 'Should throw');
        } catch (e) {
          assert.instanceOf(e, Error);
        }
      });

      test('shows the keypad', function() {
        Navigation.showKeypad();

        assert.equal(domKeypadPanel.style.visibility, 'visible');
        assert.isTrue(
          domOptionKeypad.classList.contains('toolbar-option-selected')
        );
        sinon.assert.calledWith(
          MockAccessibilityHelper.setAriaSelected,
          domOptionKeypad
        );
      });

      test('shows the call log', function() {
        Navigation.showCalllog();

        assert.equal(domRecentsPanel.style.visibility, 'visible');
        assert.isTrue(
          domOptionRecents.classList.contains('toolbar-option-selected')
        );
        sinon.assert.calledWith(
          MockAccessibilityHelper.setAriaSelected,
          domOptionRecents
        );
      });

      test('shows the contacts', function() {
        var dummyIframe = document.createElement('iframe');

        this.sinon.stub(document, 'createElement').returns(dummyIframe);
        this.sinon.spy(domIframeContactsContainer, 'appendChild');
        domIframeContactsContainer.removeChild(domContactsIframe);

        Navigation.showContacts();

        assert.equal(domIframeContactsContainer.style.visibility, 'visible');
        assert.isTrue(
          domOptionContacts.classList.contains('toolbar-option-selected')
        );
        sinon.assert.calledWith(
          MockAccessibilityHelper.setAriaSelected,
          domOptionContacts
        );

        sinon.assert.calledWith(document.createElement, 'iframe');
        sinon.assert.calledWith(
          domIframeContactsContainer.appendChild,
          dummyIframe
        );
        assert.include(dummyIframe.src, '/contacts/index.html');
        assert.equal(dummyIframe.id, 'iframe-contacts');
        assert.isTrue(dummyIframe.hasAttribute('frameBorder'));
        assert.equal(dummyIframe.getAttribute('frameBorder'), 'no');
        assert.isTrue(dummyIframe.classList.contains('grid-wrapper'));
      });

      test('navigate between panels', function() {
        Navigation.showKeypad();
        Navigation.showCalllog();

        assert.equal(domKeypadPanel.style.visibility, 'hidden');
        assert.isFalse(
          domOptionKeypad.classList.contains('toolbar-option-selected')
        );

        assert.equal(domRecentsPanel.style.visibility, 'visible');
        assert.isTrue(
          domOptionRecents.classList.contains('toolbar-option-selected')
        );

      });
    });

    suite('currentView', function() {
      test('returns the current view', function() {
        Navigation.showKeypad();
        assert.equal(Navigation.currentView, 'keypad');
        Navigation.showCalllog();
        assert.equal(Navigation.currentView, 'recents');
      });
    });
  });
});
