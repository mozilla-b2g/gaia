'use strict';

/* global CallHandler, MocksHelper, MockLazyL10n, MockNavigatormozApps,
   MockNavigatorMozIccManager, MockNavigatormozSetMessageHandler,
   NavbarManager, Notification, MockKeypadManager, MockVoicemail,
   MockCallLog, MockCallLogDBManager */

require(
  '/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js'
);
requireApp('communications/dialer/test/unit/mock_call_log.js');
requireApp('communications/dialer/test/unit/mock_call_log_db_manager.js');
requireApp('communications/dialer/test/unit/mock_lazy_loader.js');
requireApp('communications/dialer/test/unit/mock_voicemail.js');

require('/shared/test/unit/mocks/mock_accessibility_helper.js');
require('/shared/test/unit/mocks/mock_navigator_moz_apps.js');
require('/shared/test/unit/mocks/mock_navigator_moz_icc_manager.js');
require('/shared/test/unit/mocks/mock_notification.js');
require('/shared/test/unit/mocks/mock_notification_helper.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/shared/test/unit/mocks/dialer/mock_contacts.js');
require('/shared/test/unit/mocks/dialer/mock_lazy_l10n.js');
require('/shared/test/unit/mocks/dialer/mock_keypad.js');
require('/shared/test/unit/mocks/dialer/mock_utils.js');

requireApp('communications/dialer/js/dialer.js');

var mocksHelperForDialer = new MocksHelper([
  'AccessibilityHelper',
  'Contacts',
  'CallLog',
  'CallLogDBManager',
  'LazyL10n',
  'LazyLoader',
  'KeypadManager',
  'Notification',
  'NotificationHelper',
  'SettingsListener',
  'Utils',
  'Voicemail'
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
      var callEndedData;

      setup(function() {
        this.sinon.spy(window, 'Notification');
        MockNavigatorMozIccManager.addIcc('12345', {'cardState': 'ready'});
        callEndedData = {
          number: '123',
          serviceId: 1,
          direction: 'incoming'
        };
      });

      test('> One SIM', function() {
        MockNavigatormozSetMessageHandler.mTrigger('telephony-call-ended',
                                                   callEndedData);

        MockNavigatormozApps.mTriggerLastRequestSuccess();
        sinon.assert.calledWith(Notification, 'missedCall');
      });

      test('> Two SIMs', function() {
        MockNavigatorMozIccManager.addIcc('6789', {
          'cardState': 'ready'
        });

        MockNavigatormozSetMessageHandler.mTrigger('telephony-call-ended',
                                                   callEndedData);

        MockNavigatormozApps.mTriggerLastRequestSuccess();
        sinon.assert.calledWith(Notification, 'missedCallMultiSims');
        assert.deepEqual(MockLazyL10n.keys.missedCallMultiSims, {n: 2});
      });
    });

    suite('> insertion in the call log database', function() {
      var sysMsg;
      var addSpy;

      function triggerSysMsg(data) {
        MockNavigatormozSetMessageHandler.mTrigger('telephony-call-ended',
                                                   data);
      }

      setup(function() {
        sysMsg = {
          number: '12345',
          serviceId: 1,
          emergency: false,
          duration: 1200,
          direction: 'outgoing'
        };
      });

      setup(function() {
        addSpy = this.sinon.spy(MockCallLogDBManager, 'add');
      });

      suite('> voicemail', function() {
        setup(function() {
          this.sinon.spy(MockVoicemail, 'check');
          triggerSysMsg(sysMsg);
        });

        test('should check if the number if a voicemail', function() {
          sinon.assert.calledWith(MockVoicemail.check, '12345');
        });

        test('should flag the entry as voicemail if it is', function() {
          MockVoicemail.check.yield(true);
          sinon.assert.calledWithMatch(addSpy, {voicemail: true});
        });

        test('should not flag the entry if it is not', function() {
          MockVoicemail.check.yield(false);
          sinon.assert.calledWithMatch(addSpy, {voicemail: false});
        });
      });

      suite('> date', function() {
        test('should be set to now minus the call duration', function() {
          this.sinon.useFakeTimers(4200);
          triggerSysMsg(sysMsg);
          sinon.assert.calledWithMatch(addSpy, {date: 3000});
        });
      });

      suite('> type', function() {
        test('should be incoming for incoming calls', function() {
          sysMsg.direction = 'incoming';
          triggerSysMsg(sysMsg);
          sinon.assert.calledWithMatch(addSpy, {type: 'incoming'});
        });

        test('should be alerting for outgoing calls', function() {
          sysMsg.direction = 'outgoing';
          triggerSysMsg(sysMsg);
          sinon.assert.calledWithMatch(addSpy, {type: 'dialing'});
        });
      });

      test('should set the phone number', function() {
        triggerSysMsg(sysMsg);
        sinon.assert.calledWithMatch(addSpy, {number: '12345'});
      });

      test('should set the serviceId', function() {
        triggerSysMsg(sysMsg);
        sinon.assert.calledWithMatch(addSpy, {serviceId: 1});
      });

      suite('> emergency', function() {
        test('should flag the entry as emergency if it is', function() {
          sysMsg.emergency = true;
          triggerSysMsg(sysMsg);
          sinon.assert.calledWithMatch(addSpy, {emergency: true});
        });

        test('should not flag the entry if it is not', function() {
          sysMsg.emergency = null;
          triggerSysMsg(sysMsg);
          sinon.assert.calledWithMatch(addSpy, {emergency: false});
        });
      });

      suite('> status', function() {
        test('should be connected for incoming connected calls', function() {
          sysMsg.direction = 'incoming';
          triggerSysMsg(sysMsg);
          sinon.assert.calledWithMatch(addSpy, {status: 'connected'});
        });

        test('should be null otherwise', function() {
          triggerSysMsg(sysMsg);
          sinon.assert.calledWithMatch(addSpy, {status: null});
        });
      });

      test('should insert the newly inserted group in the call log view',
      function() {
        var fakeGroup = '----uniq----';
        var appendSpy = this.sinon.spy(MockCallLog, 'appendGroup');

        triggerSysMsg(sysMsg);
        addSpy.yield(fakeGroup);

        sinon.assert.calledWith(appendSpy, fakeGroup);
      });
    });

    suite('> bluetooth commands', function() {
      function sendCommand(command) {
        MockNavigatormozSetMessageHandler.mTrigger('bluetooth-dialer-command', {
          command: command
        });
      }

      test('> Dialing a specific number', function() {
        var callSpy = this.sinon.stub(CallHandler, 'call');
        sendCommand('ATD12345');
        sinon.assert.calledWith(callSpy, '12345');
      });

      test('> Dialing the last recent entry', function() {
        var getSpy = this.sinon.stub(MockCallLogDBManager,
                                     'getGroupAtPosition');
        var callSpy = this.sinon.stub(CallHandler, 'call');

        sendCommand('BLDN');
        sinon.assert.calledWith(getSpy, 1, 'lastEntryDate', true);
        getSpy.yield({number: '424242'});
        sinon.assert.calledWith(callSpy, '424242');
      });

      test('> Dialing a specific recent entry', function() {
        var getSpy = this.sinon.stub(MockCallLogDBManager,
                                     'getGroupAtPosition');
        var callSpy = this.sinon.stub(CallHandler, 'call');

        sendCommand('ATD>3');
        sinon.assert.calledWith(getSpy, 3, 'lastEntryDate', true);
        getSpy.yield({number: '333'});
        sinon.assert.calledWith(callSpy, '333');
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
