 /* global LockScreenInputpad */
'use strict';

requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/lockscreen/js/lockscreen_inputpad.js');

var mocks = new window.MocksHelper([
  'SettingsListener'
]).init();

suite('LockScreenInputpad', function() {
  var subject;
  var mockLockScreenFacade;
  var mockGetElementById;
  mocks.attachTestHelpers();
  setup(function() {
    mockGetElementById = sinon.stub(window.document, 'getElementById',
    function() {
      return document.createElement('div');
    });
    mockLockScreenFacade = {};
    subject = new LockScreenInputpad(mockLockScreenFacade);
    var stub = sinon.stub(subject, 'toggleEmergencyButton');
    subject.start();
    stub.restore();
  });

  teardown(function() {
    mockGetElementById.restore();
  });

  test('Emergency call: should disable when has no telephony', function() {
    navigator.mozTelephony = null;
    subject.states.isEmergencyEnabled = true;
    subject.toggleEmergencyButton();
    assert.isTrue(subject.states.isEmergencyEnabled === false);
  });

  test('Emergency call: should enable when has telephony', function() {
    navigator.mozTelephony = {
      calls: {
        length: 1
      }
    };
    subject.states.isEmergencyEnabled = false;
    subject.toggleEmergencyButton();
    assert.isTrue(subject.states.isEmergencyEnabled === true);
  });

  suite('updatePassCodeUI >', function() {
    test('it would set error class during error timeout state',
      function() {
        var method = subject.updatePassCodeUI;
        var mockSubject = {
          states: {
            passCodeEntered: '',
            passCodeErrorTimeoutPending: true
          },
          passcodePad: document.createElement('div'),
          passcodeCode: document.createElement('div')
        };
        method.apply(mockSubject);
        assert.isTrue(mockSubject.passcodeCode
          .classList.contains('error'),
          'error class was not added during error timeout');
      });

    test('it would clear error class when not in error timeout state',
      function() {
        var method = subject.updatePassCodeUI;
        var mockSubject = {
          states: {
            passCodeEntered: '',
            passCodeErrorTimeoutPending: false
          },
          passcodePad: document.createElement('div'),
          passcodeCode: document.createElement('div')
        };
        mockSubject.passcodeCode.classList.add('error');
        method.apply(mockSubject);
        assert.isFalse(mockSubject.passcodeCode
          .classList.contains('error'),
          'error class was not cleared outside error timeout');
      });
  });

  suite('Events >', function() {
    suite('passcode-validationfailed >', function() {
      var stubUpdatePassCodeUI;
      setup(function() {
        stubUpdatePassCodeUI =
          sinon.stub(subject, 'updatePassCodeUI');
      });
      test('event would update the UI', function() {
        subject.handleEvent(
          new CustomEvent('lockscreen-notify-passcode-validationfailed'));
        assert.isTrue(stubUpdatePassCodeUI.called,
          '|updatePassCodeUI| method wasn\'t called');
      });
      test('sets error timeout state', function() {
        subject.states.passCodeErrorTimeoutPending = false;
        subject.handleEvent(
          new CustomEvent('lockscreen-notify-passcode-validationfailed'));
        assert.isTrue(subject.states.passCodeErrorTimeoutPending === true,
          'error timeout state was not set');
      });
      teardown(function() {
        stubUpdatePassCodeUI.restore();
      });
    });

    suite('passcode-validationsuccess >', function() {
      var stubUpdatePassCodeUI;
      setup(function() {
        stubUpdatePassCodeUI =
          sinon.stub(subject, 'updatePassCodeUI');
      });
      test('it would reset UI', function() {
        subject.handleEvent(
          new CustomEvent('lockscreen-notify-passcode-validationsuccess'));
        assert.isTrue(stubUpdatePassCodeUI.called,
          '|updatePassCodeUI| method wasn\'t called');
      });
      test('it would reset internal state', function() {
        subject.states.passCodeEntered = 'fooo';
        subject.states.passCodeErrorTimeoutPending = true;
        subject.handleEvent(
          new CustomEvent('lockscreen-notify-passcode-validationsuccess'));
        assert.isTrue(subject.states.passCodeEntered === '',
          'entered pass code was not cleared');
        assert.isTrue(subject.states.passCodeErrorTimeoutPending === false,
          'timeout error state was not cleared');
      });
      teardown(function() {
        stubUpdatePassCodeUI.restore();
      });
    });

    suite('passcode-validationreset >', function() {
      // Currently identical to validationsuccess
      var stubUpdatePassCodeUI;
      setup(function() {
        stubUpdatePassCodeUI =
          sinon.stub(subject, 'updatePassCodeUI');
      });
      test('it would reset UI', function() {
        subject.handleEvent(
          new CustomEvent('lockscreen-notify-passcode-validationreset'));
        assert.isTrue(stubUpdatePassCodeUI.called,
          '|updatePassCodeUI| method wasn\'t called');
      });
      test('it would reset internal state', function() {
        subject.states.passCodeEntered = 'fooo';
        subject.states.passCodeErrorTimeoutPending = true;
        subject.handleEvent(
          new CustomEvent('lockscreen-notify-passcode-validationreset'));
        assert.isTrue(subject.states.passCodeEntered === '',
          'entered pass code was not cleared');
        assert.isTrue(subject.states.passCodeErrorTimeoutPending === false,
          'timeout error state was not cleared');
      });
      teardown(function() {
        stubUpdatePassCodeUI.restore();
      });
    });

    suite('lockscreen-inputappopened >', function() {
      var stubUpdatePassCodeUI;
      setup(function() {
        stubUpdatePassCodeUI =
          sinon.stub(subject, 'updatePassCodeUI');
      });
      test('it would update UI', function() {
        subject.handleEvent(
          new CustomEvent('lockscreen-inputappopened'));
        assert.isTrue(stubUpdatePassCodeUI.called,
          'the |updatePassCodeUI| method wasn\'t called');
      });
      teardown(function() {
        stubUpdatePassCodeUI.restore();
      });
    });

    suite('lockscreen-inputappclosed >', function() {
      // Currently identical to inputappopened
      var stubUpdatePassCodeUI;
      setup(function() {
        stubUpdatePassCodeUI =
          sinon.stub(subject, 'updatePassCodeUI');
      });
      test('it would reset UI', function() {
        subject.handleEvent(
          new CustomEvent('lockscreen-inputappclosed'));
        assert.isTrue(stubUpdatePassCodeUI.called,
          'the |updatePassCodeUI| method wasn\'t called');
      });
      teardown(function() {
        stubUpdatePassCodeUI.restore();
      });
    });

    suite('keyup', function() {
      var evt;
      setup(function() {
        evt = {
          type: 'keyup',
          keyCode: 48,
          preventDefault: function() {}
        };
      });
      test('it would get the key', function() {
        var stubHandlePassCodeInput = sinon.stub(subject,
          'handlePassCodeInput');
        subject.handleKeyEvent(evt);
        assert.isTrue(stubHandlePassCodeInput.calledWith('0'));
      });
      test('it would vibrate', function() {
        var method = subject.handlePassCodeInput;
        var mockThis = {
          lockScreen: {
            overlay: document.createElement('div'),
            checkPassCode: () => {}
          },
          states: {
            passCodeEntered: '123',
            padVibrationEnabled: true
          },
          configs: {
            padVibrationDuration: 100
          },
          updatePassCodeUI: () => {},
          padVibrationEnabled: true
        };
        var stubVibrate = this.sinon.stub(navigator, 'vibrate');
        method.call(mockThis, '4');
        assert.isTrue(stubVibrate.called);
      });
    });
  });
});
