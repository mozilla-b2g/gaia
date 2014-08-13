'use strict';

/* global CallHandler, MocksHelper, MockLazyL10n, MockNavigatormozApps,
          MockNavigatorMozIccManager, MockNavigatormozSetMessageHandler,
          NavbarManager, Notification, MockKeypadManager, MockVoicemail,
          MockCallLog, MockCallLogDBManager, MockNavigatorWakeLock,
          MockMmiManager, MockSuggestionBar, MockSimSettingsHelper,
          MockTelephonyHelper
 */

require(
  '/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js'
);
requireApp('communications/dialer/test/unit/mock_call_log.js');
requireApp('communications/dialer/test/unit/mock_call_log_db_manager.js');
requireApp('communications/dialer/test/unit/mock_lazy_loader.js');
requireApp('communications/dialer/test/unit/mock_voicemail.js');
require('/dialer/test/unit/mock_mmi_manager.js');
require('/dialer/test/unit/mock_suggestion_bar.js');
require('/dialer/test/unit/mock_telephony_helper.js');

require('/shared/test/unit/mocks/mock_navigator_wake_lock.js');
require('/shared/test/unit/mocks/mock_navigator_moz_apps.js');
require('/shared/test/unit/mocks/mock_navigator_moz_icc_manager.js');
require('/shared/test/unit/mocks/mock_notification.js');
require('/shared/test/unit/mocks/mock_notification_helper.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/shared/test/unit/mocks/mock_sim_settings_helper.js');
require('/shared/test/unit/mocks/dialer/mock_contacts.js');
require('/shared/test/unit/mocks/dialer/mock_lazy_l10n.js');
require('/shared/test/unit/mocks/dialer/mock_keypad.js');
require('/shared/test/unit/mocks/dialer/mock_tone_player.js');
require('/shared/test/unit/mocks/dialer/mock_utils.js');

requireApp('communications/dialer/js/dialer.js');

var mocksHelperForDialer = new MocksHelper([
  'TelephonyHelper',
  'Contacts',
  'CallLog',
  'CallLogDBManager',
  'LazyL10n',
  'LazyLoader',
  'KeypadManager',
  'MmiManager',
  'Notification',
  'NotificationHelper',
  'SettingsListener',
  'SimSettingsHelper',
  'SuggestionBar',
  'Utils',
  'TonePlayer',
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
  var realWakeLock;

  mocksHelperForDialer.attachTestHelpers();

  setup(function() {
    realMozApps = navigator.mozApps;
    navigator.mozApps = MockNavigatormozApps;

    realMozIccManager = navigator.mozIccManager;
    navigator.mozIccManager = MockNavigatorMozIccManager;

    realSetMessageHandler = navigator.mozSetMessageHandler;
    navigator.mozSetMessageHandler = MockNavigatormozSetMessageHandler;
    MockNavigatormozSetMessageHandler.mSetup();

    realWakeLock = navigator.requestWakeLock;
    navigator.requestWakeLock = MockNavigatorWakeLock.requestWakeLock;

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

    MockNavigatorWakeLock.mTeardown();
    navigator.requestWakeLock = realWakeLock;

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

    suite('> Receiving a ussd', function() {
      function triggerSysMsg(serviceId, sessionEnded) {
        MockNavigatormozSetMessageHandler.mTrigger('ussd-received', {
          message: 'testing',
          sessionEnded: (sessionEnded !== undefined) ? sessionEnded : true,
          serviceId: (serviceId !== undefined) ? serviceId : 0
        });
      }

      var realHidden, stubHidden;
      setup(function() {
        realHidden = document.hidden;

        Object.defineProperty(document, 'hidden', {
          configurable: true,
          get: function() { return stubHidden; }
        });

        this.sinon.useFakeTimers();
      });

      teardown(function() {
        Object.defineProperty(document, 'hidden', {
          configurable: true,
          get: function() { return realHidden; }
        });
      });

      test('should call the MmiManager', function() {
        this.sinon.spy(MockMmiManager, 'handleMMIReceived');
        triggerSysMsg();
        sinon.assert.calledWith(MockMmiManager.handleMMIReceived,
                                'testing', true);
      });

      suite('when the app is visible', function() {
        setup(function() {
          stubHidden = false;
        });

        test('should not require a high priority wake lock', function() {
          triggerSysMsg();
          var wakeLock = MockNavigatorWakeLock.mLastWakeLock;
          assert.isUndefined(wakeLock);
        });
      });

      suite('when the app is invisible', function() {
        setup(function() {
          stubHidden = true;
        });

        test('should require a high priority wake lock', function() {
          triggerSysMsg();
          var wakeLock = MockNavigatorWakeLock.mLastWakeLock;
          assert.equal(wakeLock.topic, 'high-priority');
        });

        test('should send a notification for unsolicited messages', function() {
            this.sinon.spy(MockMmiManager, 'sendNotification');
            triggerSysMsg(0, true);
            sinon.assert.calledOnce(MockMmiManager.sendNotification);
            var wakeLock = MockNavigatorWakeLock.mLastWakeLock;
            assert.isTrue(wakeLock.released);
          }
        );

        suite('once the app is visible', function() {
          setup(function() {
            triggerSysMsg();

            stubHidden = false;
          });

          test('should release the wake lock', function() {
            document.dispatchEvent(new CustomEvent('visibilitychange'));
            var wakeLock = MockNavigatorWakeLock.mLastWakeLock;
            assert.isTrue(wakeLock.released);
          });
        });

        suite('after a safety timeout', function() {
          setup(function() {
            triggerSysMsg();
          });

          test('should release the wake lock', function() {
            this.sinon.clock.tick(30000);
            var wakeLock = MockNavigatorWakeLock.mLastWakeLock;
            assert.isTrue(wakeLock.released);
          });
        });
      });
    });

    suite('> Dialing MMI codes', function() {
      setup(function (){
        this.sinon.stub(MockMmiManager, 'isMMI').returns(true);
        this.sinon.spy(MockMmiManager, 'send');
        this.sinon.spy(MockKeypadManager, 'updatePhoneNumber');
        this.sinon.spy(MockSuggestionBar, 'clear');
      });

      [0, 1].forEach(function(cardIndex) {
        test('> Dialing a generic code on SIM ' + cardIndex, function() {
          var number = '*123#';
          CallHandler.call(number, cardIndex);

          sinon.assert.calledWith(MockMmiManager.send, number, cardIndex);
          sinon.assert.calledWithMatch(MockKeypadManager.updatePhoneNumber, '');
          sinon.assert.calledOnce(MockSuggestionBar.clear);
        });

        test('> Requesting the IMEI codes on SIM ' + cardIndex, function() {
          this.sinon.spy(MockMmiManager, 'showImei');

          CallHandler.call('*#06#', cardIndex);

          sinon.assert.calledOnce(MockMmiManager.showImei);
          sinon.assert.notCalled(MockMmiManager.send);
          sinon.assert.calledWithMatch(MockKeypadManager.updatePhoneNumber, '');
          sinon.assert.calledOnce(MockSuggestionBar.clear);
        });
      });
    });

    suite('> dialing a long number', function() {
      var spy, number;
      setup(function() {
        number = '+8801535479509';
        spy = this.sinon.spy(MockKeypadManager, 'updatePhoneNumber');
      });

      test('display the number back properly if the call errors', function() {
        /*Callback the error function if this phone-call errors */
        this.sinon.stub(MockTelephonyHelper, 'call').callsArg(5);

        CallHandler.call(number, 0);

        sinon.assert.calledWithMatch(spy, number, 'begin', false);
      });
    });

    suite('> bluetooth commands', function() {
      function sendCommand(command) {
        MockNavigatormozSetMessageHandler.mTrigger('bluetooth-dialer-command', {
          command: command
        });
      }

      var getGroupAtPositionStub;
      var callSpy;

      setup(function() {
        getGroupAtPositionStub =
          this.sinon.stub(MockCallLogDBManager, 'getGroupAtPosition');
        callSpy = this.sinon.stub(CallHandler, 'call');
      });

      test('> Dialing a specific number', function() {
        sendCommand('ATD12345');
        sinon.assert.calledWith(callSpy, '12345');
      });

      suite('> Dialing the last recent entry', function() {
        setup(function() {
          sendCommand('BLDN');
        });

        test('should call getGroupAtPosition with correct position',
        function() {
          sinon.assert.calledWith(
            getGroupAtPositionStub, 1, 'lastEntryDate', true);
        });

        [0, 1].forEach(function(serviceId) {
          test('should dial on user preferred SIM ' + serviceId,
          function() {
            MockSimSettingsHelper._defaultCards.outgoingCall = serviceId;
            getGroupAtPositionStub.yield({number: '424242'});
            sinon.assert.calledWith(callSpy, '424242', serviceId);
          });
        });

        [0, 1].forEach(function(serviceId) {
          test('should use serviceId (' + serviceId + ') of last call',
          function() {
            MockSimSettingsHelper._defaultCards.outgoingCall =
              MockSimSettingsHelper.ALWAYS_ASK_OPTION_VALUE;
            getGroupAtPositionStub.yield(
              {number: '424242', serviceId: serviceId});
            sinon.assert.calledWith(callSpy, '424242', serviceId);
          });
        });
      });

      suite('> Dialing a specific recent entry', function() {
        setup(function() {
          sendCommand('ATD>3');
        });

        test('should call getGroupAtPosition with correct position',
        function() {
          sinon.assert.calledWith(
            getGroupAtPositionStub, 3, 'lastEntryDate', true);
        });

        [0, 1].forEach(function(serviceId) {
          test('should dial on user preferred SIM ' + serviceId,
          function() {
            MockSimSettingsHelper._defaultCards.outgoingCall = serviceId;
            getGroupAtPositionStub.yield({number: '333'});
            sinon.assert.calledWith(callSpy, '333', serviceId);
          });
        });

        [0, 1].forEach(function(serviceId) {
          test('should use serviceId (' + serviceId + ') of 3rd last call',
          function() {
            MockSimSettingsHelper._defaultCards.outgoingCall =
              MockSimSettingsHelper.ALWAYS_ASK_OPTION_VALUE;
            getGroupAtPositionStub.yield({number: '333', serviceId: serviceId});
            sinon.assert.calledWith(callSpy, '333', serviceId);
          });
        });
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
