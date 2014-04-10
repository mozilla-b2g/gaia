'use strict';

/* global CallHandler, MocksHelper, MockLazyL10n, MockNavigatormozApps,
   MockNavigatorMozIccManager, MockNavigatormozSetMessageHandler,
   NavbarManager, Notification, MockKeypadManager */

require(
  '/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js'
);
requireApp('communications/dialer/test/unit/mock_contacts.js');
requireApp('communications/dialer/test/unit/mock_l10n.js');
requireApp('communications/dialer/test/unit/mock_lazy_loader.js');
requireApp('communications/dialer/test/unit/mock_keypad.js');
requireApp('communications/dialer/test/unit/mock_utils.js');

require('/shared/test/unit/mocks/mock_accessibility_helper.js');
require('/shared/test/unit/mocks/mock_navigator_moz_apps.js');
require('/shared/test/unit/mocks/mock_navigator_moz_icc_manager.js');
require('/shared/test/unit/mocks/mock_notification.js');
require('/shared/test/unit/mocks/mock_notification_helper.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');

requireApp('communications/dialer/js/dialer.js');

var mocksHelperForDialer = new MocksHelper([
  'AccessibilityHelper',
  'Contacts',
  'LazyL10n',
  'LazyLoader',
  'KeypadManager',
  'Notification',
  'NotificationHelper',
  'SettingsListener',
  'Utils'
]).init();

suite('navigation bar', function() {
  var domContactsIframe;
  var domOptionRecents;
  var domOptionContacts;
  var domOptionKeypad;
  var domViews;

  var realMozApps;
  var realMozIccManager;
  var realSetMessageHandler;

  mocksHelperForDialer.attachTestHelpers();

  setup(function() {
    realMozApps = navigator.mozApps;
    navigator.mozApps = MockNavigatormozApps;

    realMozIccManager = navigator.mozIccManager;
    navigator.mozIccManager = MockNavigatorMozIccManager;

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
    NavbarManager.init();
  });

  teardown(function() {
    MockNavigatorMozIccManager.mTeardown();
    navigator.mozIccManager = realMozIccManager;

    MockNavigatormozSetMessageHandler.mTeardown();
    navigator.mozSetMessageHandler = realSetMessageHandler;

    MockNavigatormozApps.mTeardown();
    navigator.mozApps = realMozApps;

    document.body.removeChild(domViews);
  });

  suite('CallHandler', function() {
    suite('> missed call notification', function() {
      var notificationObject;

      setup(function() {
        this.sinon.spy(window, 'Notification');
        MockNavigatorMozIccManager.addIcc('12345', {'cardState': 'ready'});
        notificationObject = {
          type: 'notification',
          number: '123',
          serviceId: 1
        };
      });

      test('> One SIM', function(done) {
        // To avoid racing postMessage, listen for the event
        window.addEventListener('message', function onMessage(e) {
          window.removeEventListener('message', onMessage);
          if (e.data.type !== 'notification') {
            return;
          }
          setTimeout(function() {
            MockNavigatormozApps.mTriggerLastRequestSuccess();
            sinon.assert.calledWith(Notification, 'missedCall');
            done();
          });
        });

        window.postMessage(notificationObject, '*');
      });

      test('> Two SIMs', function(done) {
        MockNavigatorMozIccManager.addIcc('6789', {
          'cardState': 'ready'
        });

        // To avoid racing postMessage, listen for the event
        window.addEventListener('message', function onMessage(e) {
          window.removeEventListener('message', onMessage);
          if (e.data.type !== 'notification') {
            return;
          }
          setTimeout(function() {
            MockNavigatormozApps.mTriggerLastRequestSuccess();
            sinon.assert.calledWith(Notification, 'missedCallMultiSims');
            assert.deepEqual(MockLazyL10n.keys.missedCallMultiSims, {n: 2});
            done();
          });
        });

        window.postMessage(notificationObject, '*');
      });
    });

    suite('> WebActivities support', function() {
      var activity;
      var originalHash;

      function triggerActivity(activity) {
        MockNavigatormozSetMessageHandler.mTrigger('activity', activity);
      }

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
        });

        test('should show the contacts view', function() {
          triggerActivity(activity);
          assert.equal(window.location.hash, '#contacts-view');
        });
      });
    });
  });

  suite('NavbarManager', function() {
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
});
