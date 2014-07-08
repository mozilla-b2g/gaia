/* globals CallHandler, CallLogDBManager, FontSizeManager, gTonesFrequencies,
           KeypadManager, MockCall, MockCallsHandler, MockDialerIndexHtml,
           MockIccManager, MockNavigatorMozTelephony, MockNavigatorSettings,
           MockSettingsListener, MocksHelper, MockTonePlayer, SimPicker,
           telephonyAddCall, MockMultiSimActionButtonSingleton, MockMozL10n,
           CustomDialog, MockMozActivity
*/

'use strict';

require('/shared/js/dialer/keypad.js');

require('/dialer/test/unit/mock_lazy_loader.js');
require('/dialer/test/unit/mock_call_handler.js');
require('/dialer/test/unit/mock_call_log_db_manager.js');
require('/dialer/test/unit/mock_confirm_dialog.js');
require('/shared/test/unit/mocks/mock_iccmanager.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_navigator_moz_telephony.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/shared/test/unit/mocks/mock_sim_picker.js');
require('/shared/test/unit/mocks/mock_multi_sim_action_button.js');
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

var mocksHelperForKeypad = new MocksHelper([
  'LazyL10n',
  'LazyLoader',
  'Utils',
  'MultiSimActionButton',
  'CallsHandler',
  'CallHandler',
  'CallLogDBManager',
  'HandledCall',
  'SettingsListener',
  'SimPicker',
  'TonePlayer',
  'CustomDialog',
  'MozActivity',
  'FontSizeManager'
]).init();

suite('dialer/keypad', function() {
  var subject;
  var previousBody;
  var realMozActivity;
  var realMozIccManager;
  var realMozL10n;
  var realMozSettings;
  var realMozTelephony;

  mocksHelperForKeypad.attachTestHelpers();

  suiteSetup(function() {
    realMozIccManager = navigator.mozIccManager;
    navigator.mozIccManager = new MockIccManager();

    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockMozL10n;

    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
    MockNavigatorSettings.mSyncRepliesOnly = true;

    previousBody = document.body.innerHTML;
    document.body.innerHTML = MockDialerIndexHtml;
    subject = KeypadManager;
    subject.init(false);
  });

  suiteTeardown(function() {
    navigator.mozIccManager = realMozIccManager;
    navigator.mozL10n = realMozL10n;
    navigator.mozSettings = realMozSettings;
    MockNavigatorSettings.mSyncRepliesOnly = false;

    document.body.innerHTML = previousBody;
  });

  setup(function() {
    this.sinon.useFakeTimers();
    this.sinon.spy(FontSizeManager, 'adaptToSpace');
  });

  suite('Keypad Manager', function() {
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

    test('Get IMEI via send MMI', function() {
      var callSpy =
        this.sinon.spy(MockMultiSimActionButtonSingleton, 'performAction');

      var mmi = '*#06#';
      var fakeEvent = {
        target: {
          dataset: {
            value: null
          }
        },
        stopPropagation: function() {},
        type: null
      };

      for (var i = 0, end = mmi.length; i < end; i++) {
        fakeEvent.target.dataset.value = mmi.charAt(i);
        subject._phoneNumber += mmi.charAt(i);
        subject.keyHandler(fakeEvent);
      }

      sinon.assert.calledOnce(callSpy);
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
          }
        },
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

    test('FontSizeManager is invoked with the right parameters', function() {
      subject.updatePhoneNumber('1234567890', 'begin', false);
      sinon.assert.calledWith(
        FontSizeManager.adaptToSpace, FontSizeManager.DIAL_PAD,
        subject.phoneNumberView, subject.fakePhoneNumberView, false, 'begin');
    });

    suite('Audible and DTMF tones when composing numbers', function() {
      suiteSetup(function() {
        realMozTelephony = navigator.mozTelephony;
        navigator.mozTelephony = MockNavigatorMozTelephony;
      });

      suiteTeardown(function() {
        MockNavigatorMozTelephony.mSuiteTeardown();
        navigator.mozTelephony = realMozTelephony;
      });

      setup(function() {
        subject._observePreferences();
        MockSettingsListener.mCallbacks['phone.ring.keypad'](true);
      });

      teardown(function() {
        MockNavigatorMozTelephony.mTeardown();
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

        subject.init(true);
        subject.render('oncall');
      });

      teardown(function() {
        MockNavigatorMozTelephony.mTeardown();

        subject.init(false);
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
            }
          },
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

        this.sinon.spy(CallHandler, 'call');

        MockMozActivity.mSetup();
      });

      teardown(function() {
        MockMozActivity.mTeardown();
      });

      var doLongPress = function() {
        subject._touchStart('1', true);
        this.sinon.clock.tick(1500);
        subject._touchEnd('1');
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

          doLongPress.bind(this)();

          MockNavigatorSettings.mReplyToRequests();
        });

        test('should call voicemail directly', function() {
          sinon.assert.calledWith(CallHandler.call, fakeVoicemail, 0);
        });

        test('should remove 1 from phone number', shouldRemove1FromPhoneNumber);

        test('should display an error if no voicemail number is set',
        function() {
          var getSpy = this.sinon.spy(MockMozL10n, 'get');
          var showSpy = this.sinon.spy(CustomDialog, 'show');
          MockNavigatorSettings.mSettings['ril.iccInfo.mbdn'] = '';

          doLongPress.bind(this)();
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
          sinon.assert.calledWith(getSpy, 'voicemailNoNumberTitle');
          sinon.assert.calledWith(getSpy, 'voicemailNoNumberText');
          sinon.assert.calledWith(getSpy, 'voicemailNoNumberSettings');
          sinon.assert.calledWith(getSpy, 'voicemailNoNumberCancel');
        });

        test('should open settings app with MozActivity when no voicemail set',
             shouldOpenSettingsAppWithMozActivity);
      });

      suite('DualSIM', function() {
        var fakeVoicemail2 = '666';

        setup(function() {
          navigator.mozIccManager.iccIds[0] = 0;
          navigator.mozIccManager.iccIds[1] = 1;

          MockNavigatorSettings.mSettings['ril.iccInfo.mbdn'] = [
            fakeVoicemail, fakeVoicemail2];
          MockNavigatorSettings.mSettings['ril.voicemail.defaultServiceId'] = 1;

          this.sinon.spy(SimPicker, 'getOrPick');
          doLongPress.bind(this)();

          MockNavigatorSettings.mReplyToRequests();
        });

        test('should show the SIM picker for favorite SIM', function() {
          sinon.assert.calledWith(SimPicker.getOrPick, 1, 'voiceMail');
        });

        test('should call voicemail for SIM1', function() {
          SimPicker.getOrPick.yield(0);
          MockNavigatorSettings.mReplyToRequests();
          sinon.assert.calledWith(CallHandler.call, fakeVoicemail, 0);
        });

        test('should call voicemail for SIM2', function() {
          SimPicker.getOrPick.yield(1);
          MockNavigatorSettings.mReplyToRequests();
          sinon.assert.calledWith(CallHandler.call, fakeVoicemail2, 1);
        });

        test('should remove 1 from phone number', shouldRemove1FromPhoneNumber);

        test('should open settings app with MozActivity when no voicemail set',
             shouldOpenSettingsAppWithMozActivity);
      });
    });
  });

  suite('Initializing MultiSimActionButton', function() {
    setup(function() {
      subject.init(false);
    });

    test('Should initialize MultiSimActionButton', function() {
      assert.isTrue(MockMultiSimActionButtonSingleton.mIsInitialized);
    });

    test('Should pass a valid phone number getter', function() {
      subject._phoneNumber = '1111111';
      assert.equal(subject._phoneNumber,
        MockMultiSimActionButtonSingleton._phoneNumberGetter());
    });
  });
});
