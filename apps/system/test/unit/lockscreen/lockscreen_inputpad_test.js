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
    subject.start();
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

  suite('updatePassCodeUI', function() {
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
        'no passcode-entered class added');
    });

    test('it would add passcode-entered class while no passcode entered',
    function() {
      var method = subject.updatePassCodeUI;
      var mockSubject = {
        states: {
          passCodeEntered: ''
        },
        passcodePad: document.createElement('div'),
        passcodeCode: document.createElement('div')
      };
      var stubRemove = this.sinon.stub(mockSubject.passcodePad.classList,
        'remove');
      method.apply(mockSubject);
      assert.isTrue(stubRemove.called,
        'no remove method called; so the class may still stick on it');
    });
  });

  suite('decorateErrorPasscodeUI', function() {
    var originalStates,
        originalConfigs,
        stubStates,
        stubConfigs,
        stubRemoveErrorPasscodeUI;
    setup(function() {
      originalStates = Object.create(subject.states);
      originalConfigs = Object.create(subject.configs);
      stubStates = {
        passcodeErrorCounter: 0
      };
      stubConfigs = {
        passcodeDecoratingTimeout: 1
      };
      subject.states = stubStates;
      subject.configs = stubConfigs;
      stubRemoveErrorPasscodeUI = sinon.stub(subject, 'removeErrorPasscodeUI');
    });
    test('error count < 5', function(done) {
      subject.decorateErrorPasscodeUI()
      .then(() => {
        assert.equal(1, stubStates.passcodeErrorCounter);
        assert.isTrue(subject.passcodeCode.classList.contains('error'));
        assert.isTrue(subject.removeErrorPasscodeUI.called);
      })
      .then(done)
      .catch(done);
    });

    test('error count > 5', function(done) {
      subject.states.passcodeErrorCounter = 6;
      subject.decorateErrorPasscodeUI()
      .then(() => {
        assert.equal(2, subject.configs.passcodeDecoratingTimeout);
        assert.isTrue(subject.passcodeCode.classList.contains('error'));
        assert.isTrue(subject.removeErrorPasscodeUI.called);
      })
      .then(done)
      .catch(done);
    });
    teardown(function() {
      subject.states = originalStates;
      subject.configs = originalConfigs;
      stubRemoveErrorPasscodeUI.restore();
    });
  });

  suite('Events >', function() {
    suite('lockscreen-notify-passcode-validationfailed', function() {
      var stubDecorateErrorPasscodeUI,
          stubRemoveErrorPasscodeUI,
          stubUpdatePassCodeUI;
      setup(function() {
        stubDecorateErrorPasscodeUI =
          sinon.stub(subject, 'decorateErrorPasscodeUI', Promise.resolve);
        stubRemoveErrorPasscodeUI =
          sinon.stub(subject, 'removeErrorPasscodeUI');
        stubUpdatePassCodeUI =
          sinon.stub(subject, 'updatePassCodeUI');
      });
      test('it would call the following steps', function(done) {
        var promised = subject.handleEvent(
          new CustomEvent('lockscreen-notify-passcode-validationfailed'));
        promised.then(() => {
          assert.isTrue(stubRemoveErrorPasscodeUI.called,
            'the |removeErrorPasscodeUI| method wasn\'t called');
          assert.isTrue(stubUpdatePassCodeUI.called,
            'the |updatePassCodeUI| method wasn\'t called');
        })
        .then(done)
        .catch(done);
      });
      teardown(function() {
        stubDecorateErrorPasscodeUI.restore();
        stubRemoveErrorPasscodeUI.restore();
        stubUpdatePassCodeUI.restore();
      });
    });

    suite('lockscreen-notify-passcode-validationsuccess', function() {
      var stubResetPasscodeStatus,
          stubUpdatePassCodeUI;
      setup(function() {
        stubResetPasscodeStatus =
          sinon.stub(subject, 'resetPasscodeStatus');
        stubUpdatePassCodeUI =
          sinon.stub(subject, 'updatePassCodeUI');
      });
      test('it would reset UI', function() {
        subject.handleEvent(
          new CustomEvent('lockscreen-notify-passcode-validationsuccess'));
        assert.isTrue(stubResetPasscodeStatus.called,
          'the |resetPasscodeStatus| method wasn\'t called');
        assert.isTrue(stubUpdatePassCodeUI.called,
          'the |updatePassCodeUI| method wasn\'t called');
      });
      teardown(function() {
        stubResetPasscodeStatus.restore();
        stubUpdatePassCodeUI.restore();
      });
    });

    suite('lockscreen-inputappclosed', function() {
      var stubRemoveErrorPasscodeUI,
          stubUpdatePassCodeUI;
      setup(function() {
        stubRemoveErrorPasscodeUI =
          sinon.stub(subject, 'removeErrorPasscodeUI');
        stubUpdatePassCodeUI =
          sinon.stub(subject, 'updatePassCodeUI');
      });
      test('it would reset UI', function() {
        subject.handleEvent(
          new CustomEvent('lockscreen-inputappclosed'));
        assert.isTrue(stubRemoveErrorPasscodeUI.called,
          'the |removeErrorPasscodeUI| method wasn\'t called');
        assert.isTrue(stubUpdatePassCodeUI.called,
          'the |updatePassCodeUI| method wasn\'t called');
      });
      teardown(function() {
        stubRemoveErrorPasscodeUI.restore();
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
