/* globals gTonesFrequencies, KeypadManager, loadBodyHTML,
           MockIccManager, MockL10n, MockNavigatorMozTelephony,
           MockNavigatorSettings, MockSettingsListener, MocksHelper,
           MockTonePlayer
*/

'use strict';

require('/shared/test/unit/load_body_html_helper.js');
require('/shared/test/unit/mocks/mock_confirm_dialog.js');
require('/shared/test/unit/mocks/mock_iccmanager.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_navigator_moz_telephony.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/shared/test/unit/mocks/dialer/mock_call.js');
require('/shared/test/unit/mocks/dialer/mock_utils.js');
require('/shared/test/unit/mocks/dialer/mock_tone_player.js');

require('/shared/js/dialer/dtmf_tone.js');
require('/js/keypad.js');


var mocksHelperForKeypad = new MocksHelper([
  'LazyLoader',
  'Utils',
  'SettingsListener',
  'TonePlayer'
]).init();

suite('Keypad', function() {
  var subject;
  var realMozIccManager;
  var realMozL10n;
  var realMozSettings;
  var realMozTelephony;

  mocksHelperForKeypad.attachTestHelpers();

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
    loadBodyHTML('/test/unit/mock_dialer_index.html');

    subject = KeypadManager;
    subject.init(false);

    this.sinon.useFakeTimers();
  });

  teardown(function() {
    MockNavigatorMozTelephony.mTeardown();
  });

  suite('Keypad Manager', function() {
    test('initializates the TonePlayer to use the "system" channel',
    function() {
      this.sinon.spy(MockTonePlayer, 'init');
      KeypadManager.init(/* oncall */ false);

      sinon.assert.calledWith(MockTonePlayer.init, 'system');
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
  });
});
