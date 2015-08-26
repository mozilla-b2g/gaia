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
      var elem = document.createElement('div');
      elem.querySelector = function() {
        return document.createElement('div');
      };
      return elem;
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
    subject.passcodePad = document.createElement('div');
    subject.passcodePad.innerHTML = `<a data-key="e">`;
    subject.emergencyCallBtn =
      subject.passcodePad.querySelector('a[data-key=e]');
    subject.toggleEmergencyButton();
    assert.isTrue(subject.passcodePad.querySelector('a[data-key=e]')
      .classList.contains('disabled'));
  });

  test('Emergency call: should enable when has telephony', function() {
    navigator.mozTelephony = {
      calls: {
        length: 1
      }
    };
    subject.passcodePad = document.createElement('div');
    subject.passcodePad.innerHTML = `<a data-key="e">`;
    subject.emergencyCallBtn =
      subject.passcodePad.querySelector('a[data-key=e]');
    subject.toggleEmergencyButton();
    assert.isFalse(subject.passcodePad.querySelector('a[data-key=e]')
      .classList.contains('disabled'));
  });

  suite('updatePassCodeUI >', function() {
    test('it would add passcode-entered class while passcode entered',
    function() {
      var method = subject.updatePassCodeUI;
      var mockSubject = {
        states: {
          passCodeEntered: 'foo'
        },
        passcodePad: document.createElement('div'),
        passcodeCode: document.createElement('div')
      };
      method.apply(mockSubject);
      assert.isTrue(mockSubject.passcodePad
        .classList.contains('passcode-entered'),
        'passcode-entered class not added when one is entered');
    });

    test('it would clear passcode-entered class while no passcode entered',
    function() {
      var method = subject.updatePassCodeUI;
      var mockSubject = {
        states: {
          passCodeEntered: ''
        },
        passcodePad: document.createElement('div'),
        passcodeCode: document.createElement('div')
      };
      mockSubject.passcodePad.classList.add('passcode-entered');
      method.apply(mockSubject);
      assert.isFalse(mockSubject.passcodePad
        .classList.contains('passcode-entered'),
        'passcode-entered class not removed when none is entered');
    });

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

    suite('click', function() {
      var evt;
      setup(function() {
        evt = {
          type: 'click',
          preventDefault: function() {}
        };
        evt.target = {
          tagName: 'div',
          parentNode: {
            dataset: {
              key: 'f'
            },
            tagName: 'a'
          },
          dataset: {}
        };

      });
      test('it would get the key', function() {
        var stubHandlePassCodeInput = sinon.stub(subject,
          'handlePassCodeInput');
        subject.handleEvent(evt);
        assert.isTrue(stubHandlePassCodeInput.calledWith('f'));
      });
      test('it would vibrate', function() {
        var method = subject.handlePassCodeInput;
        var mockThis = {
          passcodePad: document.createElement('div'),
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
      test('it would clear notification opening ID', function() {
        var method = subject.handlePassCodeInput;
        var mockThis = {
          lockScreen: {
            invokeSecureApp: function() {},
            _unlockingMessage: {
              notificationId: 'fakeid'
            }
          },
          dispatchEvent: function() {}
        };
        method.call(mockThis, 'e');
        assert.isUndefined(
          mockThis.lockScreen._unlockingMessage.notificationId);
        mockThis.lockScreen._unlockingMessage.notificationId = 'fakeid';
        method.call(mockThis, 'c');
        assert.isUndefined(
          mockThis.lockScreen._unlockingMessage.notificationId);
      });
    });
  });
});
