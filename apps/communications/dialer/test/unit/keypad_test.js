/* globals CallHandler, CallLogDBManager, CallScreen, ConfirmDialog,
           CustomDialog, CustomElementsHelper, FontSizeManager,
           gTonesFrequencies, KeypadManager, MockCall, MockCallsHandler,
           MockIccManager, MockL10n, MockMozActivity,
           MockMultiSimActionButtonSingleton, MockNavigatorMozTelephony,
           MockNavigatorSettings, MockSettingsListener, MocksHelper,
           MockTonePlayer, SimSettingsHelper, telephonyAddCall
*/

'use strict';

require('/shared/js/dialer/dtmf_tone.js');
require('/shared/js/dialer/keypad.js');

require('/contacts/test/unit/mock_confirm_dialog.js');
require('/dialer/test/unit/mock_call_handler.js');
require('/dialer/test/unit/mock_call_log_db_manager.js');
require('/shared/test/unit/mocks/mock_iccmanager.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_multi_sim_action_button.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_navigator_moz_telephony.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/shared/test/unit/mocks/mock_sim_settings_helper.js');
require('/shared/test/unit/mocks/dialer/mock_handled_call.js');
require('/shared/test/unit/mocks/dialer/mock_call.js');
require('/shared/test/unit/mocks/dialer/mock_calls_handler.js');
require('/shared/test/unit/mocks/dialer/mock_utils.js');
require('/shared/test/unit/mocks/dialer/mock_tone_player.js');
require('/shared/test/unit/mocks/mock_custom_dialog.js');
require('/shared/test/unit/mocks/mock_moz_activity.js');
require('/shared/test/unit/mocks/dialer/mock_font_size_manager.js');
require('/dialer/test/unit/mock_dialer_index.html.js');
require(
  '/shared/test/unit/mocks/elements/gaia_sim_picker/mock_gaia_sim_picker.js');

var mocksHelperForKeypad = new MocksHelper([
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

  // Dummy node used as event target
  var dummyNode = document.createElement('div');

  /**
   * Simulate a touchstart event
   *
   * @param key {String} The target's dataset value, the touched key
   */
  function mockTouchStart(key) {
    var fakeEvent = {
      target: dummyNode,
      preventDefault: function() {},
      stopPropagation: function() {},
      type: 'touchstart'
    };
    dummyNode.dataset.value = key;
    subject.keyHandler(fakeEvent);
  }

  /**
   * Simulate a touchmove event
   *
   * @param x {Integer} Horizontal coordinate of the touch event
   * @param y {Integer} Vertical coordinate of the touch event
   */
  function mockTouchMove(x, y) {
    var fakeEvent = {
      target: dummyNode,
      preventDefault: function() {},
      stopPropagation: function() {},
      type: 'touchmove',
      touches: [ { pageX: x, pageY: y } ]
    };
    subject.keyHandler(fakeEvent);
  }

  /**
   * Simulate a touchend event
   *
   * @param key {String} The target's dataset value, the touched key
   */
  function mockTouchEnd(key) {
    var fakeEvent = {
      target: dummyNode,
      preventDefault: function() {},
      stopPropagation: function() {},
      type: 'touchend'
    };
    dummyNode.dataset.value = key;
    subject.keyHandler(fakeEvent);
  }

  /**
   * Simulate a long-press event
   *
   * @param key {String} The target's dataset value, the touched key
   * @param clock {Object} The fake sinon clock used in this test
   * @param duration {Integer} The duration of the event in ms (default: 400)
   */
  function mockLongPress(key, clock, duration) {
    mockTouchStart(key);
    clock.tick(duration || 400);
    mockTouchEnd(key);
  }

  /**
   * Send the fake events needed to emulate the typing of an umber.
   *
   * @param {String} number The number to type.
   */
  function mockTypeNumber(number) {
    for (var i = 0, end = number.length; i < end; i++) {
      mockTouchStart(number[i]);
      mockTouchEnd(number[i]);
    }
  }

  suiteSetup(function() {
    realMozIccManager = navigator.mozIccManager;
    navigator.mozIccManager = new MockIccManager();

    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

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
    dummyNode = document.createElement('div');
    subject._phoneNumber = '';
  });

  teardown(function() {
    dummyNode = null;
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

      test('Properly highlight the last key in an abbreviated dialing code',
      function() {
        for (var i = 0, end = mmi.length; i < end; i++) {
          mockTouchStart(mmi[i]);
          assert.isTrue(dummyNode.classList.contains('active'));
          mockTouchEnd(mmi[i]);
          assert.isFalse(dummyNode.classList.contains('active'));
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
        mockTouchStart('delete');
        mockTouchEnd('delete');

        sinon.assert.notCalled(KeypadManager._getSpeedDialNumber);
      });

      test('Get IMEI via send MMI', function() {
        this.sinon.spy(MockMultiSimActionButtonSingleton, 'performAction');

        mockTypeNumber(mmi);

        sinon.assert.calledOnce(
          MockMultiSimActionButtonSingleton.performAction);
      });

      test('Starts speed dial upon typing ' + speedDialNum, function() {
        this.sinon.stub(KeypadManager, '_getSpeedDialNumber', function() {
          return Promise.resolve('123');
        });

        mockTypeNumber(speedDialNum);

        sinon.assert.calledWith(KeypadManager._getSpeedDialNumber, 1);
      });
    });

    test('Multi-tap events are ignored', function() {
      mockTouchStart('1');
      assert.equal(subject._phoneNumber, '1');
      mockTouchStart('2');
      assert.equal(subject._phoneNumber, '1');
      mockTouchEnd('2');
      assert.equal(subject._phoneNumber, '1');
      mockTouchEnd('1');
      assert.equal(subject._phoneNumber, '1');
    });

    test('Call button pressed with no calls in Call Log', function() {
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
      CallLogDBManager.add(recentCall);
      subject.fetchLastCalled();
      assert.equal(subject._phoneNumber, recentCall.number);
    });

    test('Dialer is limited to 50 digits', function() {
      var digits = '111111111122222222223333333333444444444455555555556';

      mockTypeNumber(digits);

      assert.equal(subject._phoneNumber, digits.substring(0, 50));
    });

    test('Adds active class to keys when pressed', function() {
      assert.isFalse(dummyNode.classList.contains('active'));
      mockTouchStart('1');
      assert.isTrue(dummyNode.classList.contains('active'));
      mockTouchEnd('1');
      assert.isFalse(dummyNode.classList.contains('active'));
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

        mockTouchStart('1');
        assert.isTrue(startSpy.calledWith(gTonesFrequencies['1'], true));
        mockTouchEnd('1');
        assert.isTrue(stopSpy.calledOnce);
      });

      test('Button tones are disabled via prefs', function() {
        var startSpy = this.sinon.spy(MockTonePlayer, 'start');

        MockSettingsListener.mCallbacks['phone.ring.keypad'](false);
        mockTouchStart('1');
        assert.isTrue(startSpy.notCalled);
        mockTouchEnd('1');
        assert.isTrue(startSpy.notCalled);
      });

      test('Pressing a button does not play a DTMF tone', function() {
        var startToneSpy =
          this.sinon.spy(MockNavigatorMozTelephony, 'startTone');
        var stopToneSpy =
          this.sinon.spy(MockNavigatorMozTelephony, 'stopTone');

        mockTouchStart('1');
        assert.isTrue(stopToneSpy.notCalled);
        assert.isTrue(startToneSpy.notCalled);
        mockTouchEnd('1');
      });
    });

    suite('Keypad vibration', function() {
      setup(function() {
        this.sinon.spy(navigator, 'vibrate');
        subject._observePreferences();
      });

      test('vibrates if setting is set', function() {
        MockSettingsListener.mCallbacks['keyboard.vibration'](true);

        mockTouchStart('1');
        sinon.assert.calledWith(navigator.vibrate, 50);
      });

      test('does not vibrate if setting is not set', function() {
        MockSettingsListener.mCallbacks['keyboard.vibration'](false);

        mockTouchStart('1');
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

        mockTypeNumber('1#');

        sinon.assert.notCalled(KeypadManager._getSpeedDialNumber);
      });

      suite('Audible and DTMF tones', function() {
        test('Pressing a button during a call plays a long tone', function() {
          var startSpy = this.sinon.spy(MockTonePlayer, 'start');

          mockTouchStart('1');
          assert.isTrue(startSpy.calledWith(gTonesFrequencies['1'], false));
          mockTouchEnd('1');
        });

        test('Short tones are enabled via prefs', function() {
          var startSpy = this.sinon.spy(MockTonePlayer, 'start');

          MockSettingsListener.mCallbacks['phone.dtmf.type']('short');
          mockTouchStart('1');
          assert.isTrue(startSpy.calledWith(gTonesFrequencies['1'], true));
          mockTouchEnd('1');
        });

        test('Pressing a button during a call plays a DTMF tone', function() {
          this.sinon.spy(MockNavigatorMozTelephony, 'startTone');
          this.sinon.spy(MockNavigatorMozTelephony, 'stopTone');

          mockTouchStart('1');
          sinon.assert.calledWith(MockNavigatorMozTelephony.stopTone, 0);
          sinon.assert.calledWith(MockNavigatorMozTelephony.startTone, '1', 0);
          mockTouchEnd('1');
          sinon.assert.calledTwice(MockNavigatorMozTelephony.stopTone);
        });

        test('Long DTMF tones stop when leaving the button', function() {
          this.sinon.spy(MockNavigatorMozTelephony, 'startTone');
          this.sinon.spy(MockNavigatorMozTelephony, 'stopTone');

          MockSettingsListener.mCallbacks['phone.dtmf.type']('long');

          mockTouchStart('1');
          sinon.assert.calledWith(MockNavigatorMozTelephony.stopTone, 0);
          sinon.assert.calledWith(MockNavigatorMozTelephony.startTone, '1', 0);
          document.elementFromPoint.returns({ dataset: { value: '2' }});
          mockTouchMove(0, 0);
          sinon.assert.calledTwice(MockNavigatorMozTelephony.stopTone);
        });

        test('Short DTMF tones stop after 120ms', function() {
          this.sinon.spy(MockNavigatorMozTelephony, 'startTone');
          this.sinon.spy(MockNavigatorMozTelephony, 'stopTone');

          MockSettingsListener.mCallbacks['phone.dtmf.type']('short');

          mockTouchStart('1');
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

          mockTouchStart('1');
          sinon.assert.calledWith(MockNavigatorMozTelephony.stopTone, 0);
          sinon.assert.calledWith(MockNavigatorMozTelephony.startTone, '1', 0);
          this.sinon.clock.tick();
          assert.ok(true, 'got here');
          mockTouchEnd('1');
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

        mockTypeNumber(digits);
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
      mockTouchStart('*', false);
      this.sinon.clock.tick(pressTime);
      mockTouchEnd('*');
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

        this.sinon.spy(CallHandler, 'call');

        MockMozActivity.mSetup();
      });

      teardown(function() {
        MockMozActivity.mTeardown();
      });

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

          mockLongPress('1', this.sinon.clock);

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

          mockLongPress('1', this.sinon.clock);
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

        setup(function(done) {
          navigator.mozIccManager.iccIds[0] = 0;
          navigator.mozIccManager.iccIds[1] = 1;

          MockNavigatorSettings.mSettings['ril.iccInfo.mbdn'] = [
            fakeVoicemail, fakeVoicemail2];
          MockNavigatorSettings.mSettings['ril.voicemail.defaultServiceId'] = 1;

          simPicker = document.getElementById('sim-picker');
          this.sinon.spy(simPicker, 'getOrPick');
          mockLongPress('1', this.sinon.clock);

          MockNavigatorSettings.mReplyToRequests();
          
          // Artificially delay setup because getOrPick gets called in
          // l10n.formatValue which is a Promise
          Promise.resolve().then(done, done);
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

        mockLongPress('1', this.sinon.clock, 399);
        MockNavigatorSettings.mReplyToRequests();

        sinon.assert.notCalled(CallHandler.call);
      });

      test('pressing after another digit should not call', function() {
        navigator.mozIccManager.iccIds[0] = 0;
        MockNavigatorSettings.mSettings['ril.iccInfo.mbdn'] = fakeVoicemail;

        mockLongPress('2', this.sinon.clock);
        MockNavigatorSettings.mReplyToRequests();

        mockLongPress('1', this.sinon.clock);
        MockNavigatorSettings.mReplyToRequests();

        sinon.assert.notCalled(CallHandler.call);
      });
    });

    suite('Speed dial', function() {
      var speedDialNum = '1#';

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

        test('An error message is shown when no SIM card is present',
        function(done) {
          this.sinon.stub(MockIccManager.prototype, 'getIccById').returns(null);

          subject._getSpeedDialNumber(speedDialIndex).then(function() {
            assert.isTrue(false, 'The promise should not be resolved');
          }, function(error) {
            assert.equal(error, 'noSimCardToLoadContactsFrom');
          }).then(done, done);
        });
      });
    });
  });

  suite('hangUpCallFromKeypad', function() {
    /* XXX: We don't import the full mock here because it still lives in the
     * dialer sources and there's no point in moving it just for this test.
     * This will go away as soon as the dialer and keypad are reunited. */
    setup(function() {
      window.CallScreen = { hideKeypad: this.sinon.stub() };
    });

    teardown(function() {
      delete window.CallScreen;
    });

    test('hide the keypad before hanging up', function() {
      this.sinon.spy(MockCallsHandler, 'end');

      subject.hangUpCallFromKeypad();

      CallScreen.hideKeypad.calledBefore(MockCallsHandler.end);
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
