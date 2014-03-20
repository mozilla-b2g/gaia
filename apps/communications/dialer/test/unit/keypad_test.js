/* globals CallHandler, CallLogDBManager, gTonesFrequencies, KeypadManager,
           MockCall, MockCallsHandler, MockDialerIndexHtml, MockMozTelephony,
           MockSettingsListener, MocksHelper, MockTonePlayer,
           observePreferences, telephonyAddCall */

'use strict';

requireApp('communications/dialer/js/keypad.js');

requireApp('communications/dialer/test/unit/mock_lazy_loader.js');
requireApp('communications/dialer/test/unit/mock_utils.js');
requireApp('communications/dialer/test/unit/mock_call.js');
requireApp('communications/dialer/test/unit/mock_call_handler.js');
requireApp('communications/dialer/test/unit/mock_call_log_db_manager.js');
requireApp('communications/dialer/test/unit/mock_calls_handler.js');
requireApp('communications/dialer/test/unit/mock_handled_call.js');
requireApp('communications/dialer/test/unit/mock_moztelephony.js');
requireApp('communications/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('communications/dialer/test/unit/mock_tone_player.js');

requireApp('communications/dialer/test/unit/mock_dialer_index.html.js');

var mocksHelperForKeypad = new MocksHelper([
  'LazyLoader',
  'Utils',
  'CallHandler',
  'CallsHandler',
  'CallLogDBManager',
  'HandledCall',
  'SettingsListener',
  'TonePlayer'
]).init();

suite('dialer/keypad', function() {
  var subject;
  var previousBody;
  var realMozTelephony;

  mocksHelperForKeypad.attachTestHelpers();

  suiteSetup(function() {
    previousBody = document.body.innerHTML;
    document.body.innerHTML = MockDialerIndexHtml;
    subject = KeypadManager;
  });

  suiteTeardown(function() {
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

      assert.equal(CallHandler._lastCall, mmi);
    });

    test('Call button pressed with no calls in Call Log', function() {
      subject._phoneNumber = '';
      subject.makeCall();
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
        subject.makeCall();
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
      subject.makeCall();
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
        observePreferences();
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
        mockCall = new MockCall('12334', 'connected', 0);
        MockMozTelephony.active = mockCall;
        mockHC = telephonyAddCall.call(this, mockCall);
        MockCallsHandler.mActiveCall = mockHC;
        observePreferences();
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
          this.sinon.spy(MockMozTelephony, 'startTone');
          this.sinon.spy(MockMozTelephony, 'stopTone');

          subject._touchStart('1');
          sinon.assert.calledWith(MockMozTelephony.stopTone, 0);
          sinon.assert.calledWith(MockMozTelephony.startTone, '1', 0);
          subject._touchEnd('1');
          sinon.assert.calledTwice(MockMozTelephony.stopTone);
        });

        test('Long DTMF tones stop when leaving the button', function() {
          this.sinon.spy(MockMozTelephony, 'startTone');
          this.sinon.spy(MockMozTelephony, 'stopTone');

          MockSettingsListener.mCallbacks['phone.dtmf.type']('long');

          subject._touchStart('1');
          sinon.assert.calledWith(MockMozTelephony.stopTone, 0);
          sinon.assert.calledWith(MockMozTelephony.startTone, '1', 0);
          document.elementFromPoint.returns({ dataset: { value: '2' }});
          subject._touchMove({ pageX: 0, pageY: 0 });
          sinon.assert.calledTwice(MockMozTelephony.stopTone);
        });

        test('Short DTMF tones stop after 120ms', function() {
          this.sinon.spy(MockMozTelephony, 'startTone');
          this.sinon.spy(MockMozTelephony, 'stopTone');

          MockSettingsListener.mCallbacks['phone.dtmf.type']('short');

          subject._touchStart('1');
          this.sinon.clock.tick(119);
          sinon.assert.calledWith(MockMozTelephony.stopTone, 0);
          sinon.assert.calledOnce(MockMozTelephony.startTone, '1', 0);
          this.sinon.clock.tick(1);
          sinon.assert.calledTwice(MockMozTelephony.stopTone);
        });
      });

      suite('then during a conference group', function() {
        suiteSetup(function() {
          MockCallsHandler.mActiveCall = null;
          MockMozTelephony.conferenceGroup.calls = MockMozTelephony.calls;
          MockMozTelephony.active = MockMozTelephony.conferenceGroup;
        });

        test('should not fail while typing', function() {
          this.sinon.spy(MockMozTelephony, 'startTone');
          this.sinon.spy(MockMozTelephony, 'stopTone');

          subject._touchStart('1');
          sinon.assert.calledWith(MockMozTelephony.stopTone, 0);
          sinon.assert.calledWith(MockMozTelephony.startTone, '1', 0);
          this.sinon.clock.tick();
          assert.ok(true, 'got here');
          subject._touchEnd('1');
          sinon.assert.calledWith(MockMozTelephony.stopTone, 0);
        });

        test('should not fail when restoring infos', function() {
          subject.restorePhoneNumber();
          subject.restoreAdditionalContactInfo();
          assert.ok(true, 'got here');
        });
      });
    });
  });
});
