/* globals CallHandler, CallLogDBManager, ConfirmDialog, FontSizeManager,
           gTonesFrequencies, KeypadManager, MockCall, MockCallsHandler,
           MockIccManager, MockNavigatorMozTelephony, MockNavigatorSettings,
           MockSettingsListener, MocksHelper, MockTonePlayer, telephonyAddCall,
           MockMultiSimActionButtonSingleton, MockMozL10n,  CustomDialog,
           MockMozActivity, SimSettingsHelper, CustomElementsHelper
*/

'use strict';

require('/shared/js/dialer/dtmf_tone.js');
require('/shared/js/dialer/keypad.js');

require('/contacts/test/unit/mock_confirm_dialog.js');
require('/dialer/test/unit/mock_call_handler.js');
require('/dialer/test/unit/mock_call_log_db_manager.js');
require('/shared/test/unit/mocks/mock_iccmanager.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_multi_sim_action_button.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_navigator_moz_telephony.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/shared/test/unit/mocks/mock_sim_settings_helper.js');
require('/shared/test/unit/mocks/dialer/mock_handled_call.js');
require('/shared/test/unit/mocks/dialer/mock_call.js');
require('/shared/test/unit/mocks/dialer/mock_calls_handler.js');
require('/shared/test/unit/mocks/dialer/mock_lazy_l10n.js');
require('/shared/test/unit/mocks/dialer/mock_utils.js');
require('/shared/test/unit/mocks/dialer/mock_tone_player.js');
require('/shared/test/unit/mocks/mock_custom_dialog.js');
require('/shared/test/unit/mocks/mock_moz_activity.js');
require('/shared/test/unit/mocks/dialer/mock_font_size_manager.js');
require('/dialer/test/unit/mock_dialer_index.html.js');
require(
  '/shared/test/unit/mocks/elements/gaia_sim_picker/mock_gaia_sim_picker.js');

var mocksHelperForKeypad = new MocksHelper([
  'LazyL10n',
  'LazyLoader',
  'Utils',
  'MultiSimActionButton',
  'CallsHandler',
  'CallHandler',
  'CallLogDBManager',
  'ConfirmDialog',
  'HandledCall',
  'SettingsListener',
  'SimSettingsHelper',
  'GaiaSimPicker',
  'TonePlayer',
  'CustomDialog',
  'MozActivity',
  'FontSizeManager'
]).init();

var customElementsHelperForKeypad = new CustomElementsHelper([
  'GaiaSimPicker'
]);

suite('dialer/keypad', function() {
  var subject;
  var realMozActivity;
  var realMozIccManager;
  var realMozL10n;
  var realMozSettings;
  var realMozTelephony;

  mocksHelperForKeypad.attachTestHelpers();

  // Helpers for testing abbreviated dialing codes
  var node;
  var fakeEventStart;
  var fakeEventEnd;

  /**
   * Create the mock elements needed to test abbreviated dialing codes.
   */
  function setupAbbreviatedDialingCodesMocks() {
    subject._phoneNumber = '';
    node = document.createElement('div');
    fakeEventStart = {
      target: node,
      preventDefault: function() {},
      stopPropagation: function() {},
      type: 'touchstart'
    };
    fakeEventEnd = {
      target: node,
      preventDefault: function() {},
      stopPropagation: function() {},
      type: 'touchend'
    };
  }

  /**
   * Send the fake events needed to emulate the typing of an abbreviated
   * dialing code.
   *
   * @param {String} number The abbrevited dialing code to type.
   */
  function typeAbbreviatedDialingCode(number) {
    for (var i = 0, end = number.length; i < end; i++) {
      fakeEventStart.target.dataset.value = number.charAt(i);
      subject.keyHandler(fakeEventStart);
      fakeEventEnd.target.dataset.value = number.charAt(i);
      subject.keyHandler(fakeEventEnd);
    }
  }

  suiteSetup(function() {
    realMozIccManager = navigator.mozIccManager;
    navigator.mozIccManager = new MockIccManager();

    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockMozL10n;

    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
    MockNavigatorSettings.mSyncRepliesOnly = true;

    realMozTelephony = navigator.mozTelephony;
    navigator.mozTelephony = MockNavigatorMozTelephony;

    loadBodyHTML('/dialer/test/unit/mock_dialer_index.html');

    subject = KeypadManager;
    subject.init(/* oncall */ false);

    customElementsHelperForKeypad.resolve();
  });

  suiteTeardown(function() {
    navigator.mozIccManager = realMozIccManager;
    navigator.mozL10n = realMozL10n;
    navigator.mozSettings = realMozSettings;
    MockNavigatorSettings.mSyncRepliesOnly = false;
    MockNavigatorMozTelephony.mSuiteTeardown();
    navigator.mozTelephony = realMozTelephony;
  });

  setup(function() {
    this.sinon.useFakeTimers();
  });

  teardown(function() {
    MockNavigatorMozTelephony.mTeardown();
  });

  suite('Keypad Manager', function() {
    test('initializates the TonePlayer to use the system audio channel',
    function() {
      this.sinon.spy(MockTonePlayer, 'init');
      KeypadManager.init(/* oncall */ false);

      sinon.assert.calledOnce(MockTonePlayer.init);
      sinon.assert.calledWithExactly(MockTonePlayer.init, 'system');
    });

    test('sanitizePhoneNumber', function(done) {
      var testCases = {
          '111-111-1111': '111-111-1111',
          ' 222-222-2222 ': '222-222-2222',
          ' 333  -  333  -  3333 ': '333-333-3333',
          '4444  4444  4444': '444444444444',
          '555\n555\n5555': '5555555555',
          '666\t666\t6666': '6666666666'
      };

      var counter = 0;

      function verifyNumber(index) {
        return function() {
          var sanitized = subject.sanitizePhoneNumber(index);
          assert.equal(sanitized, testCases[index]);
        };
      }

      for (var i in testCases) {
        counter++;
        test('#sanitizePhoneNumber - test case ' + counter, verifyNumber(i));
      }

      done();
    });

    suite('Abbreviated dialing codes', function() {
      var mmi = '*#06#';
      var speedDialNum = '1#';

      setup(function() {
        setupAbbreviatedDialingCodesMocks();
      });

      test('Properly highlight the last key in an abbreviated dialing code',
      function() {
        for (var i = 0, end = mmi.length; i < end; i++) {
          fakeEventStart.target.dataset.value = mmi.charAt(i);
          subject.keyHandler(fakeEventStart);
          assert.isTrue(node.classList.contains('active'));
          fakeEventEnd.target.dataset.value = mmi.charAt(i);
          subject.keyHandler(fakeEventEnd);
          assert.isFalse(node.classList.contains('active'));
        }
      });

      test('Start an abbreviated dialing code operation only upon pressing #',
      function() {
        this.sinon.spy(KeypadManager, '_getSpeedDialNumber');
        /* This simulates the user having typed a number with a # in the middle
         * without triggering a an abbreviated dial operation, possibly by
         * moving  the cursor to insert the #. In this scenario an abbreviated
         * dialing operation should not be triggered. */
        subject._phoneNumber = '1#1';

        fakeEventStart.target.dataset.value = 'delete';
        subject.keyHandler(fakeEventStart);
        fakeEventEnd.target.dataset.value = 'delete';
        subject.keyHandler(fakeEventEnd);

        sinon.assert.notCalled(KeypadManager._getSpeedDialNumber);
      });

      test('Get IMEI via send MMI', function() {
        this.sinon.spy(MockMultiSimActionButtonSingleton, 'performAction');

        typeAbbreviatedDialingCode(mmi);

        sinon.assert.calledOnce(
          MockMultiSimActionButtonSingleton.performAction);
      });

      test('Starts speed dial upon typing ' + speedDialNum, function() {
        this.sinon.stub(KeypadManager, '_getSpeedDialNumber', function() {
          return Promise.resolve('123');
        });

        typeAbbreviatedDialingCode(speedDialNum);

        sinon.assert.calledWith(KeypadManager._getSpeedDialNumber, 1);
      });
    });

    test('Call button pressed with no calls in Call Log', function() {
      subject._phoneNumber = '';
      subject.fetchLastCalled();
      assert.equal(subject._phoneNumber, '');
    });

    test('Call button pressed with an incoming call and no outgoing calls ' +
      'in Call Log', function() {
      var recentCall = {
        number: '666666666',
        type: 'incoming',
        date: Date.now(),
        status: 'connected'
      };
      CallLogDBManager.add(recentCall, function(result) {
        subject._phoneNumber = '';
        subject.fetchLastCalled();
        assert.equal(subject._phoneNumber, '');
      });
    });

    test('Call button pressed with outgoing call in Call Log', function() {
      var recentCall = {
        number: '666666666',
        type: 'dialing',
        date: Date.now()
      };
      subject._phoneNumber = '';
      CallLogDBManager.add(recentCall);
      subject.fetchLastCalled();
      assert.equal(subject._phoneNumber, recentCall.number);
    });

    test('Dialer is limited to 50 digits', function() {
      var digits = '111111111122222222223333333333444444444455555555556';
      var fakeEvent = {
        target: {
          dataset: {
            value: null
          },
          classList: {
            add: function() {},
            remove: function() {}
          }
        },
        preventDefault: function() {},
        stopPropagation: function() {},
        type: null
      };

      subject._phoneNumber = '';
      for (var i = 0, end = digits.length; i < end; i++) {
        fakeEvent.target.dataset.value = digits.charAt(i);
        fakeEvent.type = 'touchstart';
        subject.keyHandler(fakeEvent);
        fakeEvent.type = 'touchend';
        subject.keyHandler(fakeEvent);
      }
      assert.equal(subject._phoneNumber, digits.substring(0, 50));
    });

    test('Adds active class to keys when pressed', function() {
      var fakeEvent = {
        target: document.createElement('div'),
        preventDefault: function() {},
        stopPropagation: function() {},
        type: null
      };
      fakeEvent.target.dataset.value = 1;

      subject._phoneNumber = '';

      assert.isFalse(fakeEvent.target.classList.contains('active'));
      fakeEvent.type = 'touchstart';
      subject.keyHandler(fakeEvent);
      assert.isTrue(fakeEvent.target.classList.contains('active'));
      fakeEvent.type = 'touchend';
      subject.keyHandler(fakeEvent);
      assert.isFalse(fakeEvent.target.classList.contains('active'));
    });

    test('FontSizeManager is invoked with the right parameters', function() {
      this.sinon.spy(FontSizeManager, 'adaptToSpace');
      subject.updatePhoneNumber('1234567890', 'begin', false);
      sinon.assert.calledWith(
        FontSizeManager.adaptToSpace, FontSizeManager.DIAL_PAD,
        subject.phoneNumberView, false, 'begin');
    });

    suite('Audible and DTMF tones when composing numbers', function() {

      setup(function() {
        subject._observePreferences();
        MockSettingsListener.mCallbacks['phone.ring.keypad'](true);
      });

      test('Pressing a button plays a short tone', function() {
        var startSpy = this.sinon.spy(MockTonePlayer, 'start');
        var stopSpy = this.sinon.spy(MockTonePlayer, 'stop');

        subject._touchStart('1');
        assert.isTrue(startSpy.calledWith(gTonesFrequencies['1'], true));
        subject._touchEnd('1');
        assert.isTrue(stopSpy.calledOnce);
      });

      test('Button tones are disabled via prefs', function() {
        var startSpy = this.sinon.spy(MockTonePlayer, 'start');

        MockSettingsListener.mCallbacks['phone.ring.keypad'](false);
        subject._touchStart('1');
        assert.isTrue(startSpy.notCalled);
        subject._touchEnd('1');
        assert.isTrue(startSpy.notCalled);
      });

      test('Pressing a button does not play a DTMF tone', function() {
        var startToneSpy =
          this.sinon.spy(MockNavigatorMozTelephony, 'startTone');
        var stopToneSpy =
          this.sinon.spy(MockNavigatorMozTelephony, 'stopTone');

        subject._touchStart('1');
        assert.isTrue(stopToneSpy.notCalled);
        assert.isTrue(startToneSpy.notCalled);
      });
    });

    suite('Keypad vibration', function() {
      setup(function() {
        this.sinon.spy(navigator, 'vibrate');
        subject._observePreferences();
      });

      test('vibrates if setting is set', function() {
        MockSettingsListener.mCallbacks['keyboard.vibration'](true);

        subject._touchStart('1');
        sinon.assert.calledWith(navigator.vibrate, 50);
      });

      test('does not vibrate if setting is not set', function() {
        MockSettingsListener.mCallbacks['keyboard.vibration'](false);

        subject._touchStart('1');
        sinon.assert.notCalled(navigator.vibrate);
      });
    });

    suite('During  a call', function() {
      var mockCall;
      var mockHC;
      var phoneNumber;

      suiteSetup(function() {
        realMozTelephony = navigator.mozTelephony;
        navigator.mozTelephony = MockNavigatorMozTelephony;
      });

      suiteTeardown(function() {
        MockNavigatorMozTelephony.mSuiteTeardown();
        navigator.mozTelephony = realMozTelephony;
      });

      setup(function() {
        phoneNumber = '12334';
        mockCall = new MockCall(phoneNumber, 'connected', 0);
        MockNavigatorMozTelephony.active = mockCall;
        mockHC = telephonyAddCall.call(this, mockCall);
        MockCallsHandler.mActiveCall = mockHC;
        MockSettingsListener.mCallbacks['phone.ring.keypad'](true);

        this.sinon.stub(document, 'elementFromPoint');

        subject.init(/* oncall */ true);
        subject.render('oncall');
      });

      teardown(function() {
        subject.init(/* oncall */ false);
      });

      test('Disable abbreviated dialing codes', function() {
        this.sinon.spy(KeypadManager, '_getSpeedDialNumber');

        setupAbbreviatedDialingCodesMocks();
        typeAbbreviatedDialingCode('1#');

        sinon.assert.notCalled(KeypadManager._getSpeedDialNumber);
      });

      suite('Audible and DTMF tones', function() {
        test('Pressing a button during a call plays a long tone', function() {
          var startSpy = this.sinon.spy(MockTonePlayer, 'start');

          subject._touchStart('1');
          assert.isTrue(startSpy.calledWith(gTonesFrequencies['1'], false));
          subject._touchEnd('1');
        });

        test('Short tones are enabled via prefs', function() {
          var startSpy = this.sinon.spy(MockTonePlayer, 'start');

          MockSettingsListener.mCallbacks['phone.dtmf.type']('short');
          subject._touchStart('1');
          assert.isTrue(startSpy.calledWith(gTonesFrequencies['1'], true));
          subject._touchEnd('1');
        });

        test('Pressing a button during a call plays a DTMF tone', function() {
          this.sinon.spy(MockNavigatorMozTelephony, 'startTone');
          this.sinon.spy(MockNavigatorMozTelephony, 'stopTone');

          subject._touchStart('1');
          sinon.assert.calledWith(MockNavigatorMozTelephony.stopTone, 0);
          sinon.assert.calledWith(MockNavigatorMozTelephony.startTone, '1', 0);
          subject._touchEnd('1');
          sinon.assert.calledTwice(MockNavigatorMozTelephony.stopTone);
        });

        test('Long DTMF tones stop when leaving the button', function() {
          this.sinon.spy(MockNavigatorMozTelephony, 'startTone');
          this.sinon.spy(MockNavigatorMozTelephony, 'stopTone');

          MockSettingsListener.mCallbacks['phone.dtmf.type']('long');

          subject._touchStart('1');
          sinon.assert.calledWith(MockNavigatorMozTelephony.stopTone, 0);
          sinon.assert.calledWith(MockNavigatorMozTelephony.startTone, '1', 0);
          document.elementFromPoint.returns({ dataset: { value: '2' }});
          subject._touchMove({ pageX: 0, pageY: 0 });
          sinon.assert.calledTwice(MockNavigatorMozTelephony.stopTone);
        });

        test('Short DTMF tones stop after 120ms', function() {
          this.sinon.spy(MockNavigatorMozTelephony, 'startTone');
          this.sinon.spy(MockNavigatorMozTelephony, 'stopTone');

          MockSettingsListener.mCallbacks['phone.dtmf.type']('short');

          subject._touchStart('1');
          this.sinon.clock.tick(119);
          sinon.assert.calledWith(MockNavigatorMozTelephony.stopTone, 0);
          sinon.assert.calledOnce(MockNavigatorMozTelephony.startTone, '1', 0);
          this.sinon.clock.tick(1);
          sinon.assert.calledTwice(MockNavigatorMozTelephony.stopTone);
        });
      });

      suite('then during a conference group', function() {
        suiteSetup(function() {
          MockCallsHandler.mActiveCall = null;
          MockNavigatorMozTelephony.conferenceGroup.calls =
            MockNavigatorMozTelephony.calls;
          MockNavigatorMozTelephony.active =
            MockNavigatorMozTelephony.conferenceGroup;
        });

        test('should not fail while typing', function() {
          this.sinon.spy(MockNavigatorMozTelephony, 'startTone');
          this.sinon.spy(MockNavigatorMozTelephony, 'stopTone');

          subject._touchStart('1');
          sinon.assert.calledWith(MockNavigatorMozTelephony.stopTone, 0);
          sinon.assert.calledWith(MockNavigatorMozTelephony.startTone, '1', 0);
          this.sinon.clock.tick();
          assert.ok(true, 'got here');
          subject._touchEnd('1');
          sinon.assert.calledWith(MockNavigatorMozTelephony.stopTone, 0);
        });

        test('should not fail when restoring infos', function() {
          subject.restorePhoneNumber();
          subject.restoreAdditionalContactInfo();
          assert.ok(true, 'got here');
        });
      });

      test('Dialer is not limited to 50 digits while on a call', function() {
        var digits = '11111111112222222222333333333344444444445555555555' +
          '6666666666';
        var fakeEvent = {
          target: {
            dataset: {
              value: null
            },
            classList: {
              add: function() {},
              remove: function() {}
            }
          },
          preventDefault: function() {},
          stopPropagation: function() {},
          type: null
        };

        subject._phoneNumber = '';
        for (var i = 0, end = digits.length; i < end; i++) {
          fakeEvent.target.dataset.value = digits.charAt(i);
          fakeEvent.type = 'touchstart';
          subject.keyHandler(fakeEvent);
          fakeEvent.type = 'touchend';
          subject.keyHandler(fakeEvent);
        }
        assert.equal(subject._phoneNumber, digits);
      });

      test('Should return active call phone number', function() {
        assert.equal(subject.phoneNumber(), phoneNumber);
      });
    });

    suite('<<pause>> hotkey when long pressing *', function() {
      var testNumberAfterLongPress = function(initialNumber, pressTime,
        expectedNumber) {
      subject._phoneNumber = initialNumber;
      subject._touchStart('*', false);
      this.sinon.clock.tick(pressTime);
      subject._touchEnd('*');
        assert.equal(KeypadManager.phoneNumber(), expectedNumber);
      };

      setup(function() {
        testNumberAfterLongPress = testNumberAfterLongPress.bind(this);
      });

      test('it should output "," and remove "*"', function() {
        testNumberAfterLongPress('12345', 1000, '12345,');
      });

      test('if it is the first symbol, it should not be added', function() {
        testNumberAfterLongPress('', 1000, '');
      });

      test('if it is not long enough it should output "*"', function() {
        testNumberAfterLongPress('123', 200, '123*');
      });
    });

    suite('voiceMail hotkey', function() {
      var fakeVoicemail;

      suiteSetup(function() {
        realMozActivity = window.MozActivity;
        window.MozActivity = MockMozActivity;
      });

      suiteTeardown(function() {
        window.MozActivity = realMozActivity;
      });

      setup(function() {
        fakeVoicemail = '888';
        KeypadManager._phoneNumber = '';

        doLongPress = doLongPress.bind(this);

        this.sinon.spy(CallHandler, 'call');

        MockMozActivity.mSetup();
      });

      teardown(function() {
        MockMozActivity.mTeardown();
      });

      var doLongPress = function(digit, time) {
        time = time || 400;
        subject._touchStart(digit);
        this.sinon.clock.tick(time);
        subject._touchEnd(digit);
      };

      var shouldRemove1FromPhoneNumber = function() {
        assert.equal(KeypadManager.phoneNumber(), '');
      };

      var shouldOpenSettingsAppWithMozActivity = function() {
        var activitySpy = this.sinon.spy(window, 'MozActivity');
        subject.showVoicemailSettings();
        sinon.assert.calledWithNew(activitySpy);
        sinon.assert.calledOnce(activitySpy);
        assert.deepEqual(activitySpy.firstCall.args, [{
          name: 'configure',
          data: {
            target: 'device',
            section: 'call'
          }
        }]);
      };

      suite('SingleSIM', function() {
        setup(function() {
          navigator.mozIccManager.iccIds[0] = 0;
          MockNavigatorSettings.mSettings['ril.iccInfo.mbdn'] = fakeVoicemail;

          doLongPress('1');

          MockNavigatorSettings.mReplyToRequests();
        });

        test('should call voicemail directly', function() {
          sinon.assert.calledWith(CallHandler.call, fakeVoicemail, 0);
        });

        test('should remove 1 from phone number', shouldRemove1FromPhoneNumber);

        test('should display an error if no voicemail number is set',
        function() {
          var showSpy = this.sinon.spy(CustomDialog, 'show');
          MockNavigatorSettings.mSettings['ril.iccInfo.mbdn'] = '';

          doLongPress('1');
          MockNavigatorSettings.mReplyToRequests();

          var expectedVoicemailDialog = {
            title: 'voicemailNoNumberTitle',
            text: 'voicemailNoNumberText',
            confirm: {
              title: 'voicemailNoNumberSettings',
              recommend: true,
              callback: subject.showVoicemailSettings
            },
            cancel: {
              title: 'voicemailNoNumberCancel',
              callback: subject._hideNoVoicemailDialog
            }
          };

          sinon.assert.calledWith(showSpy,
            expectedVoicemailDialog.title, expectedVoicemailDialog.text,
            expectedVoicemailDialog.cancel, expectedVoicemailDialog.confirm);
        });

        test('should open settings app with MozActivity when no voicemail set',
             shouldOpenSettingsAppWithMozActivity);
      });

      suite('DualSIM', function() {
        var fakeVoicemail2 = '666';
        var simPicker;

        setup(function() {
          navigator.mozIccManager.iccIds[0] = 0;
          navigator.mozIccManager.iccIds[1] = 1;

          MockNavigatorSettings.mSettings['ril.iccInfo.mbdn'] = [
            fakeVoicemail, fakeVoicemail2];
          MockNavigatorSettings.mSettings['ril.voicemail.defaultServiceId'] = 1;

          simPicker = document.getElementById('sim-picker');
          this.sinon.spy(simPicker, 'getOrPick');
          doLongPress('1');

          MockNavigatorSettings.mReplyToRequests();
        });

        test('should show the SIM picker for favorite SIM', function() {
          sinon.assert.calledWith(simPicker.getOrPick, 1, 'voiceMail');
        });

        test('should call voicemail for SIM1', function() {
          simPicker.getOrPick.yield(0);
          MockNavigatorSettings.mReplyToRequests();
          sinon.assert.calledWith(CallHandler.call, fakeVoicemail, 0);
        });

        test('should call voicemail for SIM2', function() {
          simPicker.getOrPick.yield(1);
          MockNavigatorSettings.mReplyToRequests();
          sinon.assert.calledWith(CallHandler.call, fakeVoicemail2, 1);
        });

        test('should remove 1 from phone number', shouldRemove1FromPhoneNumber);

        test('should open settings app with MozActivity when no voicemail set',
             shouldOpenSettingsAppWithMozActivity);
      });

      test('pressing less than 400ms should not call', function() {
        navigator.mozIccManager.iccIds[0] = 0;
        MockNavigatorSettings.mSettings['ril.iccInfo.mbdn'] = fakeVoicemail;

        doLongPress('1', 399);
        MockNavigatorSettings.mReplyToRequests();

        sinon.assert.notCalled(CallHandler.call);
      });

      test('pressing after another digit should not call', function() {
        navigator.mozIccManager.iccIds[0] = 0;
        MockNavigatorSettings.mSettings['ril.iccInfo.mbdn'] = fakeVoicemail;

        doLongPress('2');
        MockNavigatorSettings.mReplyToRequests();

        doLongPress('1');
        MockNavigatorSettings.mReplyToRequests();

        sinon.assert.notCalled(CallHandler.call);
      });
    });

    suite('Speed dial', function() {
      var speedDialNum = '1#';

      setup(function() {
        subject._phoneNumber = '';
      });

      test(speedDialNum + ' is a speed dial number', function() {
        assert.isTrue(subject._isSpeedDialNumber(speedDialNum));
      });

      test('123 is not a speed dial number', function() {
        assert.isFalse(subject._isSpeedDialNumber('123'));
      });

      test('*#31# is not a speed dial number', function() {
        assert.isFalse(subject._isSpeedDialNumber('*#31#'));
      });

      suite('Getting a speed dial number', function() {
        var speedDialIndex = '1';
        var numbers = [ '123', '456' ];

        suiteSetup(function() {
          navigator.mozIccManager.adnContacts = [
            {
              id: numbers[1],
              tel: [ { value: numbers[1] } ]
            },
            {
              id: numbers[0],
              tel: [ { value: numbers[0] } ]
            }
          ];
        });

        setup(function() {
          this.sinon.spy(ConfirmDialog, 'show');
          this.sinon.spy(ConfirmDialog, 'hide');
        });

        test('The overlay is displayed and then hidden', function(done) {
          subject._getSimContactsList(0).then(function() {
            sinon.assert.calledOnce(ConfirmDialog.show);
            sinon.assert.calledWith(ConfirmDialog.show, 'loadingSimContacts');
            sinon.assert.calledOnce(ConfirmDialog.hide);
          }).then(done, done);
        });

        test('Cancelling the overlay works', function(done) {
          navigator.mozIccManager.async = true;

          var p = subject._getSimContactsList(0);
          ConfirmDialog.executeNo();

          p.then(function() {
            assert.ok(false, 'Should not succeed');
          }, function() {
            sinon.assert.calledOnce(ConfirmDialog.show);
            sinon.assert.calledOnce(ConfirmDialog.hide);
          }).then(done, done);

          navigator.mozIccManager.async = false;
        });

        test('The contacts are returned sorted by ID', function(done) {
          subject._getSimContactsList(0).then(function(contacts) {
            assert.equal(contacts[0].id, numbers[0]);
            assert.equal(contacts[1].id, numbers[1]);
          }).then(done, done);
        });

        test('The proper number is returned', function(done) {
          subject._getSpeedDialNumber(speedDialIndex).then(function(number) {
            assert.equal(number, numbers[0]);
          }).then(done, done);
        });

        test('0# is ignored', function(done) {
          subject._getSpeedDialNumber('0').then(function(number) {
            assert.ok(false, 'the promise should be rejected');
          }, function(error) {
            assert.equal(error, 'noContactsWereFound');
          }).then(done, done);
        });

        test('The SIM picker is used when there is no default SIM',
        function(done) {
          var simPicker = document.getElementById('sim-picker');
          navigator.mozIccManager.iccIds[0] = 0;
          navigator.mozIccManager.iccIds[1] = 1;

          this.sinon.stub(SimSettingsHelper, 'getCardIndexFrom');
          this.sinon.spy(simPicker, 'getOrPick');

          var p = subject._getSpeedDialNumber(speedDialIndex);
          SimSettingsHelper.getCardIndexFrom
                           .yield(SimSettingsHelper.ALWAYS_ASK_OPTION_VALUE);
          simPicker.getOrPick.yield(0);
          p.then(function(number) {
            sinon.assert.calledOnce(simPicker.getOrPick);
            assert.equal(number, numbers[0]);
          }).then(done, done);
        });
      });
    });
  });

  suite('Initializing MultiSimActionButton', function() {
    var callBarCallActionButton;
    var addEventListenerSpy;

    setup(function() {
      callBarCallActionButton =
        document.getElementById('keypad-callbar-call-action');
      addEventListenerSpy = this.sinon.spy(callBarCallActionButton,
                                           'addEventListener');

      subject.init(/* oncall */ false);
    });

    test('Should initialize MultiSimActionButton', function() {
      assert.isTrue(MockMultiSimActionButtonSingleton.mIsInitialized);
    });

    test('Should pass a valid phone number getter', function() {
      subject._phoneNumber = '1111111';
      assert.equal(subject._phoneNumber,
                   MockMultiSimActionButtonSingleton._phoneNumberGetter());
    });

    test('Should add the first click event handler to the button', function() {
      assert.equal(addEventListenerSpy.firstCall.args[0], 'click');
      assert.equal(addEventListenerSpy.firstCall.args[1],
                   MockMultiSimActionButtonSingleton._click);
    });
  });
});
