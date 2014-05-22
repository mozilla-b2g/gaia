'use strict';

/* global ActivityHandler, AccessibilityHelper, KeypadManager,
    LazyLoader, SettingsListener, TonePlayer */

require(
  '/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js'
);
require('/dialer/test/unit/mock_lazy_loader.js');

require('/shared/test/unit/mocks/mock_accessibility_helper.js');
require('/shared/test/unit/mocks/dialer/mock_keypad.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/shared/test/unit/mocks/dialer/mock_tone_player.js');

require('/dialer/js/activity_handler.js');
require('/dialer/js/dialer.js');

var mocksHelperForActivityHandler = new MocksHelper([
  'AccessibilityHelper',
  'KeypadManager',
  'LazyLoader',
  'SettingsListener',
  'TonePlayer'
]).init();

suite('dialer/ActivityHandler', function() {
  var domContactsIframe;
  var domOptionRecents;
  var domOptionContacts;
  var domOptionKeypad;
  var domViews;

  var realSetMessageHandler;

  mocksHelperForActivityHandler.attachTestHelpers();

  setup(function() {
    realSetMessageHandler = navigator.mozSetMessageHandler;
    navigator.mozSetMessageHandler = MockNavigatormozSetMessageHandler;
    MockNavigatormozSetMessageHandler.mSetup();

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

    CallHandler.init();
  });

  teardown(function() {
    MockNavigatormozSetMessageHandler.mTeardown();
    navigator.mozSetMessageHandler = realSetMessageHandler;

    document.body.removeChild(domViews);
  });

  suite('> Test activity', function() {
    var activity;
    var originalHash;

    function triggerActivity(activity) {
      MockNavigatormozSetMessageHandler.mTrigger('activity', activity);
    }

    setup(function() {

    });

    teardown(function() {
      window.location.hash = originalHash;
    });

    suite('> dialer activity', function() {
      setup(function() {
        originalHash = window.location.hash;

        activity = {
          source: {
            name: 'dial',
            data: {
              type: 'webtelephony/number',
              number: '12345'
            }
          }
        };
      });

      teardown(function() {
        window.location.hash = originalHash;
      });

      suite('> dial activity with a number', function() {
        test('should fill the phone number view', function() {
          var spy = this.sinon.spy(MockKeypadManager, 'updatePhoneNumber');
          triggerActivity(activity);
          sinon.assert.calledWith(spy, '12345', 'begin', false);
        });

        test('should show the keypad view', function() {
          triggerActivity(activity);
          assert.equal(window.location.hash, '#keyboard-view');
        });
      });

      suite('> dial without a number', function() {
        setup(function() {
          activity.source.data.number = '';
          triggerActivity(activity);
        });

        test('should show the contacts view', function() {
          assert.equal(window.location.hash, '#contacts-view');
        });

        test('should go to home of contacts', function() {
          assert.isTrue(
            domContactsIframe.src.contains('/contacts/index.html#home')
          );
        });
      });
    });

    suite('> pick activity', function() {
      setup(function() {
        originalHash = window.location.hash;

        activity = {
          source: {
            name: 'pick',
            data: {
              type: 'webcontacts/tel',
              multipick: 1
            }
          }
        };
      });

      teardown(function() {
        window.location.hash = originalHash;
      });

      test('should show the call log view', function() {
        triggerActivity(activity);
        assert.equal(window.location.hash, '#call-log-view');
      });
    });
  });
});
