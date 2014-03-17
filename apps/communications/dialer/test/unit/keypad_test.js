/* globals CallButton, CallHandler, CallLogDBManager, gTonesFrequencies,
           KeypadManager, MockCall, MockCallButton, MockCallsHandler,
           MockDialerIndexHtml, MockIccManager, MockMozTelephony,
           MockNavigatorSettings, MockSettingsListener, MocksHelper,
           MockTonePlayer, SimPicker, telephonyAddCall
*/

'use strict';

require('/dialer/js/keypad.js');

require('/dialer/test/unit/mock_lazy_loader.js');
require('/dialer/test/unit/mock_l10n.js');
require('/dialer/test/unit/mock_utils.js');
require('/dialer/test/unit/mock_call.js');
require('/dialer/test/unit/mock_call_button.js');
require('/dialer/test/unit/mock_call_handler.js');
require('/dialer/test/unit/mock_call_log_db_manager.js');
require('/dialer/test/unit/mock_calls_handler.js');
require('/dialer/test/unit/mock_handled_call.js');
require('/dialer/test/unit/mock_moztelephony.js');
require('/dialer/test/unit/mock_tone_player.js');
require('/shared/test/unit/mocks/mock_iccmanager.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/shared/test/unit/mocks/mock_sim_picker.js');

require('/dialer/test/unit/mock_dialer_index.html.js');

var mocksHelperForKeypad = new MocksHelper([
  'LazyL10n',
  'LazyLoader',
  'Utils',
  'CallButton',
  'CallsHandler',
  'CallHandler',
  'CallLogDBManager',
  'HandledCall',
  'SettingsListener',
  'SimPicker',
  'TonePlayer'
]).init();

suite('dialer/keypad', function() {
  var subject;
  var previousBody;
  var realMozIccManager;
  var realMozSettings;
  var realMozTelephony;

  mocksHelperForKeypad.attachTestHelpers();

  suiteSetup(function() {
    realMozIccManager = navigator.mozIccManager;
    navigator.mozIccManager = new MockIccManager();

    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
    MockNavigatorSettings.mSyncRepliesOnly = true;

    previousBody = document.body.innerHTML;
    document.body.innerHTML = MockDialerIndexHtml;
    subject = KeypadManager;
  });

  suiteTeardown(function() {
    navigator.mozIccManager = realMozIccManager;
    navigator.mozSettings = realMozSettings;
    MockNavigatorSettings.mSyncRepliesOnly = false;

    document.body.innerHTML = previousBody;
  });

  setup(function() {
    this.sinon.useFakeTimers();
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
      var callSpy = this.sinon.spy(CallButton, 'makeCall');

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

    suite('Audible and DTMF tones when composing numbers', function() {
      suiteSetup(function() {
        realMozTelephony = navigator.mozTelephony;
        navigator.mozTelephony = MockMozTelephony;
      });

      suiteTeardown(function() {
        MockMozTelephony.mSuiteTeardown();
        navigator.mozTelephony = realMozTelephony;
      });

      setup(function() {
        subject._observePreferences();
        MockSettingsListener.mCallbacks['phone.ring.keypad'](true);
      });

      teardown(function() {
        MockMozTelephony.mTeardown();
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
        var startToneSpy = this.sinon.spy(MockMozTelephony, 'startTone');
        var stopToneSpy = this.sinon.spy(MockMozTelephony, 'stopTone');

        subject._touchStart('1');
        assert.isTrue(stopToneSpy.notCalled);
        assert.isTrue(startToneSpy.notCalled);
      });
    });

    suite('During  a call', function() {
      var mockCall;
      var mockHC;

      suiteSetup(function() {
        realMozTelephony = navigator.mozTelephony;
        navigator.mozTelephony = MockMozTelephony;
      });

      suiteTeardown(function() {
        MockMozTelephony.mSuiteTeardown();
        navigator.mozTelephony = realMozTelephony;
      });

      setup(function() {
        mockCall = new MockCall('12334', 'connected');
        mockHC = telephonyAddCall.call(this, mockCall);
        MockCallsHandler.mActiveCall = mockHC;
        MockSettingsListener.mCallbacks['phone.ring.keypad'](true);

        this.sinon.stub(document, 'elementFromPoint');

        subject.init(true);
        subject.render('oncall');
      });

      teardown(function() {
        MockMozTelephony.mTeardown();

        subject.init(false);
      });

      suite('Audible and DTMF tones', function() {
        test('Pressing a button during a call plays a long tone', function() {
          var startSpy = this.sinon.spy(MockTonePlayer, 'start');

          subject._touchStart('1');
          assert.isTrue(startSpy.calledWith(gTonesFrequencies['1'], false));
        });

        test('Short tones are enabled via prefs', function() {
          var startSpy = this.sinon.spy(MockTonePlayer, 'start');

          MockSettingsListener.mCallbacks['phone.dtmf.type']('short');
          subject._touchStart('1');
          assert.isTrue(startSpy.calledWith(gTonesFrequencies['1'], true));
        });

        test('Pressing a button during a call plays a DTMF tone', function() {
          var startToneSpy = this.sinon.spy(MockMozTelephony, 'startTone');
          var stopToneSpy = this.sinon.spy(MockMozTelephony, 'stopTone');

          subject._touchStart('1');
          assert.isTrue(stopToneSpy.calledOnce);
          assert.isTrue(startToneSpy.calledWith('1'));
          subject._touchEnd('1');
          assert.equal(stopToneSpy.callCount, 2);
        });

        test('Long DTMF tones stop when leaving the button', function() {
          var stopToneSpy = this.sinon.spy(MockMozTelephony, 'stopTone');

          MockSettingsListener.mCallbacks['phone.dtmf.type']('long');

          subject._touchStart('1');
          assert.isTrue(stopToneSpy.calledOnce);
          document.elementFromPoint.returns({ dataset: { value: '2' }});
          subject._touchMove({ pageX: 0, pageY: 0 });
          assert.equal(stopToneSpy.callCount, 2);
        });

        test('Short DTMF tones stop after 120ms', function() {
          var stopToneSpy = this.sinon.spy(MockMozTelephony, 'stopTone');

          MockSettingsListener.mCallbacks['phone.dtmf.type']('short');

          subject._touchStart('1');
          this.sinon.clock.tick(119);
          assert.isTrue(stopToneSpy.calledOnce);
          this.sinon.clock.tick(1);
          assert.equal(stopToneSpy.callCount, 2);
        });
      });

      suite('then during a conference group', function() {
        setup(function() {
          MockCallsHandler.mActiveCall = null;
        });

        test('should not fail while typing', function() {
          subject._touchStart('1');
          this.sinon.clock.tick();
          assert.ok(true, 'got here');
        });

        test('should not fail when restoring infos', function() {
          subject.restorePhoneNumber();
          subject.restoreAdditionalContactInfo();
          assert.ok(true, 'got here');
        });
      });
    });

    suite('voiceMail hotkey', function() {
      setup(function() {
        this.sinon.spy(CallHandler, 'call');
      });

      suite('SingleSIM', function() {
        var fakeVoicemail = '888';

        setup(function() {
          navigator.mozIccManager.iccIds[0] = 0;
          MockNavigatorSettings.mSettings['ril.iccInfo.mbdn'] = fakeVoicemail;

          subject._touchStart('1', true);
          this.sinon.clock.tick(1500);
          subject._touchEnd('1');

          MockNavigatorSettings.mReplyToRequests();
        });

        test('should call voicemail directly', function() {
          sinon.assert.calledWith(CallHandler.call, fakeVoicemail, 0);
        });
      });

      suite('DualSIM', function() {
        var fakeVoicemail1 = '1664';
        var fakeVoicemail2 = '666';

        setup(function() {
          navigator.mozIccManager.iccIds[0] = 0;
          navigator.mozIccManager.iccIds[1] = 1;

          MockNavigatorSettings.mSettings['ril.iccInfo.mbdn'] = [fakeVoicemail1,
          fakeVoicemail2];
          MockNavigatorSettings.mSettings['ril.voicemail.defaultServiceId'] = 1;

          this.sinon.spy(SimPicker, 'show');
          subject._touchStart('1', true);
          this.sinon.clock.tick(1500);
          subject._touchEnd('1');

          MockNavigatorSettings.mReplyToRequests();
        });

        test('should show the SIM picker for favorite SIM', function() {
          sinon.assert.calledWith(SimPicker.show, 1, 'voiceMail');
        });

        test('should call voicemail for SIM1', function() {
          SimPicker.show.yield(0);
          MockNavigatorSettings.mReplyToRequests();
          sinon.assert.calledWith(CallHandler.call, fakeVoicemail1, 0);
        });

        test('should call voicemail for SIM2', function() {
          SimPicker.show.yield(1);
          MockNavigatorSettings.mReplyToRequests();
          sinon.assert.calledWith(CallHandler.call, fakeVoicemail2, 1);
        });
      });
    });
  });

  suite('Initializing CallButton', function() {
    test('Should initialize CallButton', function() {
      var initSpy = this.sinon.spy(MockCallButton, 'init');
      subject.init(false);
      sinon.assert.calledOnce(initSpy);
    });

    test('Should pass a valid phone number getter', function() {
      subject.init(false);
      subject._phoneNumber = '1111111';
      assert.equal(subject._phoneNumber, MockCallButton._phoneNumberGetter());
    });
  });
});
