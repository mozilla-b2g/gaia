'use strict';

/* global CallHandler, MocksHelper, MockLazyL10n, MockNavigatormozApps,
   MockNavigatorMozIccManager, MockNavigatormozSetMessageHandler,
   NavbarManager, Notification, MockKeypadManager, MockVoicemail,
   MockCallLog, MockCallLogDBManager, MockNavigatorWakeLock, MockMmiManager,
   MockSuggestionBar, LazyLoader, AccessibilityHelper, MockSimSettingsHelper,
   MockSimPicker, MockTelephonyHelper */

require(
  '/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js'
);
require('/shared/test/unit/mocks/mock_navigator_wake_lock.js');
require('/dialer/test/unit/mock_call_log.js');
require('/dialer/test/unit/mock_call_log_db_manager.js');
require('/dialer/test/unit/mock_lazy_loader.js');
require('/dialer/test/unit/mock_mmi_manager.js');
require('/dialer/test/unit/mock_voicemail.js');
require('/dialer/test/unit/mock_suggestion_bar.js');
require('/dialer/test/unit/mock_telephony_helper.js');

require('/shared/test/unit/mocks/mock_accessibility_helper.js');
require('/shared/test/unit/mocks/mock_navigator_moz_apps.js');
require('/shared/test/unit/mocks/mock_navigator_moz_icc_manager.js');
require('/shared/test/unit/mocks/mock_notification.js');
require('/shared/test/unit/mocks/mock_notification_helper.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/shared/test/unit/mocks/mock_sim_picker.js');
require('/shared/test/unit/mocks/mock_sim_settings_helper.js');
require('/shared/test/unit/mocks/dialer/mock_contacts.js');
require('/shared/test/unit/mocks/dialer/mock_lazy_l10n.js');
require('/shared/test/unit/mocks/dialer/mock_keypad.js');
require('/shared/test/unit/mocks/dialer/mock_tone_player.js');
require('/shared/test/unit/mocks/dialer/mock_utils.js');

require('/dialer/js/dialer.js');

var mocksHelperForDialer = new MocksHelper([
  'TelephonyHelper',
  'AccessibilityHelper',
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
  'SimPicker',
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
          id: { number: '123' },
          serviceId: 1,
          direction: 'incoming',
          hangUpLocal: false
        };
      });

      suite('> One SIM', function() {
        setup(function() {
          MockNavigatormozSetMessageHandler.mTrigger('telephony-call-ended',
                                                     callEndedData);
          MockNavigatormozApps.mTriggerLastRequestSuccess();
        });

        test('should localize the notification message', function() {
          assert.deepEqual(MockLazyL10n.keys['from-contact'],
            {contact: 'test name'});
        });

        test('should send the notification', function() {
          sinon.assert.calledWith(Notification, 'missedCall');
        });
      });

      suite('> Two SIMs', function() {
        setup(function() {
          MockNavigatorMozIccManager.addIcc('6789', {
            'cardState': 'ready'
          });
          MockNavigatormozSetMessageHandler.mTrigger('telephony-call-ended',
                                                     callEndedData);
          MockNavigatormozApps.mTriggerLastRequestSuccess();
        });

        test('should localize the notification message', function() {
          assert.deepEqual(MockLazyL10n.keys['from-contact'],
            {contact: 'test name'});
        });

        test('should send the notification', function() {
          sinon.assert.calledWith(Notification, 'missedCallMultiSims');
          assert.deepEqual(MockLazyL10n.keys.missedCallMultiSims, {n: 2});
        });
      });

      suite('> Rejected call', function() {
        setup(function() {
          callEndedData.hangUpLocal = true;
          MockNavigatormozSetMessageHandler.mTrigger('telephony-call-ended',
                                                     callEndedData);
        });

        test('does not send notification', function() {
          // Requesting an app indicates that we are sending a notification.
          assert.isNull(MockNavigatormozApps.mLastRequest);
        });
      });
    });

    suite('> insertion in the call log database', function() {
      var sysMsg;
      var addStub;

      function triggerSysMsg(data) {
        MockNavigatormozSetMessageHandler.mTrigger('telephony-call-ended',
                                                   data);
      }

      setup(function() {
        sysMsg = {
          id: { number: '12345' },
          serviceId: 1,
          emergency: false,
          duration: 1200,
          direction: 'outgoing'
        };
      });

      setup(function() {
        addStub = this.sinon.stub(MockCallLogDBManager, 'add');
      });

      test('should require a high priority wake lock', function() {
        triggerSysMsg(sysMsg);
        var wakeLock = MockNavigatorWakeLock.mLastWakeLock;
        assert.equal(wakeLock.topic, 'high-priority');
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
          sinon.assert.calledWithMatch(addStub, {voicemail: true});
        });

        test('should not flag the entry if it is not', function() {
          MockVoicemail.check.yield(false);
          sinon.assert.calledWithMatch(addStub, {voicemail: false});
        });
      });

      suite('> date', function() {
        test('should be set to now minus the call duration', function() {
          this.sinon.useFakeTimers(4200);
          triggerSysMsg(sysMsg);
          sinon.assert.calledWithMatch(addStub, {date: 3000});
        });
      });

      test('should set the duration', function() {
        triggerSysMsg(sysMsg);
        sinon.assert.calledWithMatch(addStub, {duration: 1200});
      });

      suite('> type', function() {
        test('should be incoming for incoming calls', function() {
          sysMsg.direction = 'incoming';
          triggerSysMsg(sysMsg);
          sinon.assert.calledWithMatch(addStub, {type: 'incoming'});
        });

        test('should be alerting for outgoing calls', function() {
          sysMsg.direction = 'outgoing';
          triggerSysMsg(sysMsg);
          sinon.assert.calledWithMatch(addStub, {type: 'dialing'});
        });
      });

      test('should set the phone number', function() {
        triggerSysMsg(sysMsg);
        sinon.assert.calledWithMatch(addStub, {number: '12345'});
      });

      suite('> with a CDMA second call', function() {
        setup(function() {
          sysMsg.secondNumber = '23456';
        });

        test('should insert two different calls in the database', function() {
          triggerSysMsg(sysMsg);
          sinon.assert.calledWithMatch(addStub, {number: '12345'});
          addStub.yield();
          sinon.assert.calledWithMatch(addStub, {number: '23456'});
        });

        test('should insert the secondCall in the database', function() {
          triggerSysMsg(sysMsg);
          addStub.yield();
          sinon.assert.calledWithMatch(addStub, {
            duration: 1200,
            type: 'incoming',
            number: '23456',
            serviceId: 1,
            emergency: false,
            voicemail: false,
            status: 'connected'
          });
        });

        test('should also insert new call waiting group for cdma log view',
        function() {
          var fakeCdmaGroup = 'random useless string';
          var fakeCdmaGroupSecondCall = 'another random string';
          var appendSpy = this.sinon.spy(MockCallLog, 'appendGroup');

          triggerSysMsg(sysMsg);
          addStub.yield(fakeCdmaGroup);
          addStub.yield(fakeCdmaGroupSecondCall);

          sinon.assert.calledWith(appendSpy, fakeCdmaGroup);
          sinon.assert.calledWith(appendSpy, fakeCdmaGroupSecondCall);
        });

        test('should only unlock after second call is added',
        function() {
          triggerSysMsg(sysMsg);
          var wakeLock = MockNavigatorWakeLock.mLastWakeLock;
          addStub.yield();
          assert.equal(wakeLock.mUnlockCount, 0);
          addStub.yield();
          assert.equal(wakeLock.mUnlockCount, 1);
        });
      });

      test('should set the serviceId', function() {
        triggerSysMsg(sysMsg);
        sinon.assert.calledWithMatch(addStub, {serviceId: 1});
      });

      suite('> emergency', function() {
        test('should flag the entry as emergency if it is', function() {
          sysMsg.emergency = true;
          triggerSysMsg(sysMsg);
          sinon.assert.calledWithMatch(addStub, {emergency: true});
        });

        test('should not flag the entry if it is not', function() {
          sysMsg.emergency = null;
          triggerSysMsg(sysMsg);
          sinon.assert.calledWithMatch(addStub, {emergency: false});
        });
      });

      suite('> status', function() {
        test('should be connected for incoming connected calls', function() {
          sysMsg.direction = 'incoming';
          triggerSysMsg(sysMsg);
          sinon.assert.calledWithMatch(addStub, {status: 'connected'});
        });

        test('should be null otherwise', function() {
          triggerSysMsg(sysMsg);
          sinon.assert.calledWithMatch(addStub, {status: null});
        });
      });

      test('should insert the newly inserted group in the call log view',
      function() {
        var fakeGroup = '----uniq----';
        var appendSpy = this.sinon.spy(MockCallLog, 'appendGroup');

        triggerSysMsg(sysMsg);
        addStub.yield(fakeGroup);

        sinon.assert.calledWith(appendSpy, fakeGroup);
      });

      test('should release the wake lock', function() {
        triggerSysMsg(sysMsg);
        addStub.yield();
        var wakeLock = MockNavigatorWakeLock.mLastWakeLock;
        assert.isTrue(wakeLock.released);
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

      [0, 1].forEach(function(serviceId) {
        test('> Dialing a specific number on user preferred SIM ' + serviceId,
        function() {
          MockSimSettingsHelper._defaultCards.outgoingCall = serviceId;
          sendCommand('ATD12345');
          sinon.assert.calledWith(callSpy, '12345', serviceId);
        });
      });

      test('> Dialing a specific number with user preferred SIM always ask',
      function() {
        this.sinon.spy(MockSimPicker, 'getOrPick');
        var serviceId = MockSimSettingsHelper._defaultCards.outgoingCall =
          MockSimSettingsHelper.ALWAYS_ASK_OPTION_VALUE;
        sendCommand('ATD12345');
        sinon.assert.calledWith(MockSimPicker.getOrPick, serviceId, '12345');
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

  suite('window resize', function() {
    var stubInnerHeight;

    setup(function() {
      Object.defineProperty(window, 'innerHeight', {
        configurable: true,
        get: function() { return stubInnerHeight; }
      });
    });

    teardown(function() {
      delete window.innerHeight;
    });

    test('should hide the navbar when the keyboard is displayed', function() {
      stubInnerHeight = 439;
      this.sinon.stub(NavbarManager, 'hide');
      window.onresize();
      sinon.assert.called(NavbarManager.hide);
    });

    test('should display the navbar when the keyboard is absent', function() {
      stubInnerHeight = 441;
      this.sinon.stub(NavbarManager, 'show');
      window.onresize();
      sinon.assert.called(NavbarManager.show);
    });
  });

  suite('accessibility helper', function() {
    var loadSpy;
    var hash;

    setup(function() {
      loadSpy = this.sinon.spy(LazyLoader, 'load');
      this.sinon.spy(AccessibilityHelper, 'setAriaSelected');

      hash = window.location.hash;

      NavbarManager.resourcesLoaded = false;
    });

    teardown(function() {
      window.location.hash = hash;
    });

    ['#call-log-view',
     '#contacts-view',
     '#keyboard-view'].forEach(function(view) {
      test('should load accessibility helper before using it in view ' + view,
      function(done) {
        function handleHashChange(event) {
          window.removeEventListener('hashchange', handleHashChange);

          assert.isTrue(loadSpy.getCall(0).args[0].indexOf(
            '/shared/js/accessibility_helper.js') !== -1);
          sinon.assert.callOrder(
            loadSpy, AccessibilityHelper.setAriaSelected);

          done();
        }

        window.addEventListener('hashchange', handleHashChange);

        window.location.hash = view;
      });
    });
  });
});
