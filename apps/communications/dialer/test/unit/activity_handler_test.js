/* globals CallHandler, MockKeypadManager, MocksHelper,
   MockNavigatormozSetMessageHandler, LazyLoader, SettingsListener */
/* exported LazyLoader, SettingsListener */

'use strict';

require(
  '/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js'
);
require('/dialer/test/unit/mock_lazy_loader.js');

require('/shared/test/unit/mocks/dialer/mock_keypad.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');

require('/dialer/js/activity_handler.js');
require('/dialer/js/dialer.js');

var mocksHelperForActivityHandler = new MocksHelper([
  'KeypadManager',
  'LazyLoader',
  'SettingsListener'
]).init();

suite('dialer/ActivityHandler', function() {
  var eltContactsIframe;
  var eltOptionRecents;
  var eltOptionContacts;
  var eltOptionKeypad;
  var eltViews;

  var realSetMessageHandler;

  mocksHelperForActivityHandler.attachTestHelpers();

  suiteSetup(function() {
    realSetMessageHandler = navigator.mozSetMessageHandler;
    navigator.mozSetMessageHandler = MockNavigatormozSetMessageHandler;
  });

  suiteTeardown(function() {
    MockNavigatormozSetMessageHandler.mTeardown();
    navigator.mozSetMessageHandler = realSetMessageHandler;
  });

  setup(function() {
    MockNavigatormozSetMessageHandler.mSetup();

    eltViews = document.createElement('section');
    eltViews.id = 'views';

    eltOptionRecents = document.createElement('a');
    eltOptionRecents.id = 'option-recents';
    eltViews.appendChild(eltOptionRecents);

    eltOptionContacts = document.createElement('a');
    eltOptionContacts.id = 'option-contacts';
    eltViews.appendChild(eltOptionContacts);

    eltOptionKeypad = document.createElement('a');
    eltOptionKeypad.id = 'option-keypad';
    eltViews.appendChild(eltOptionKeypad);

    eltContactsIframe = document.createElement('iframe');
    eltContactsIframe.id = 'iframe-contacts';
    eltOptionContacts.appendChild(eltContactsIframe);

    document.body.appendChild(eltViews);

    CallHandler.init();
  });

  teardown(function() {
    document.body.removeChild(eltViews);
  });

  suite('> Test activity', function() {
    var activity;
    var originalHash;

    function triggerActivity(activity) {
      MockNavigatormozSetMessageHandler.mTrigger('activity', activity);
    }

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
            eltContactsIframe.src.contains('/contacts/index.html#home')
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
