'use strict';

/* global CallHandler, MocksHelper, MockLazyL10n, MockNavigatormozApps,
   MockNavigatorMozIccManager, NavbarManager, Notification */

requireApp('communications/dialer/test/unit/mock_contacts.js');
requireApp('communications/dialer/test/unit/mock_l10n.js');
requireApp('communications/dialer/test/unit/mock_lazy_loader.js');
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

  mocksHelperForDialer.attachTestHelpers();

  setup(function() {
    realMozApps = navigator.mozApps;
    navigator.mozApps = MockNavigatormozApps;

    realMozIccManager = navigator.mozIccManager;
    navigator.mozIccManager = MockNavigatorMozIccManager;


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
