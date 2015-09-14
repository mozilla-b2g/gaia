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
  var mockHtmlKeypad;
  var oneKey;
  var twoKey;
  var threeKey;
  var emergencyKey;
  var cancelKey;
  var backKey;
  var mockSettingLock;
  var mockMozSettings;
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
    mockSettingLock = function(dummyResult) {
      this.then = (cb) => {
        cb();
        return this;
      };
      this.catch = () => {};
      this.get = () => {
        return this;
      };
      this.result = dummyResult;
    };
    mockMozSettings = (function (){
      this._observers = {};
      this._originalSettings =  window.navigator.mozSettings;
      this._attemptToGetLock = () => {
        // Mock the value by alternating this function.
        return new mockSettingLock();
      };
      this.createLock = () => {
        return this._attemptToGetLock();
      };
      this.addObserver = (name, cb) => {
        this._observers[name] = cb;
      };
      return this;
    }).call({});
    window.navigator.mozSettings = mockMozSettings;

    // Build a mock keypad that helper functions can work on.
    // Uses verbatim HTML from keypad from lockscreen_inputpad_frame.html
    mockHtmlKeypad = document.createElement('html');
    mockHtmlKeypad.appendChild(document.createElement('div'));
    // Don't use + to concatenate strings, or eslint will jump
    // at you for use of unsafe innerHTML.
    mockHtmlKeypad.firstChild.innerHTML = `
        <a role="key" href="#" data-key="1"
          class="row0"><div>1<span></span></div></a>
        <a role="key" href="#" data-key="2"
          class="row0"><div>2<span>ABC</span></div></a>
        <a role="key" href="#" data-key="3"
          class="row0"><div>3<span>DEF</span></div></a>
        <a role="button" href="#" data-key="e"
          class="lockscreen-passcode-pad-func last-row row3"><div>
          <span data-l10n-id="emergency-call-button">Emergency Call</span>
          </div></a>
        <a role="key" href="#" data-key="0" class="last-row row3">
          <div>0</div></a>
        <a role="button" href="#" data-key="c"
          class="lockscreen-passcode-pad-func last-row row3"><div>
          <span data-l10n-id="cancel">Cancel</span></div></a>
        <a role="button" href="#" data-key="b" class="last-row row3">
          <div data-l10n-id="undo">⌫</div></a>
      `;
    oneKey = mockHtmlKeypad.firstChild.children[0];
    twoKey = mockHtmlKeypad.firstChild.children[1];
    threeKey = mockHtmlKeypad.firstChild.children[2];
    emergencyKey = mockHtmlKeypad.firstChild.children[3];
    cancelKey = mockHtmlKeypad.firstChild.children[5];
    backKey = mockHtmlKeypad.firstChild.children[6];

    subject = new LockScreenInputpad(mockLockScreenFacade);
    var stub = sinon.stub(subject, 'toggleEmergencyButton');
    this.sinon.stub(window.navigator.mozSettings, '_attemptToGetLock',
    function() {
      var lock = new mockSettingLock(
        {'lockscreen.passcode.strength': 'normal'});
      return lock;
    });
    subject.start();
    stub.restore();
  });

  teardown(function() {
    mockGetElementById.restore();
    window.navigator.mozSettings = mockMozSettings._originalSettings;
  });

  test('It will change the UI when the length changes', function() {
    var stubRenderUI = this.sinon.stub(subject, 'renderUI');
    navigator.mozSettings.
      _observers['lockscreen.passcode.strength']({ settingValue: 'enhanced' });
    assert.equal(subject.configs.padPinLength, 6,
      'With "enhanced" passcode, the length is not 6');
    assert.isTrue(stubRenderUI.called, 'Not redraw after the change');
    navigator.mozSettings.
      _observers['lockscreen.passcode.strength']({ settingValue: 'normal' });
    assert.equal(subject.configs.padPinLength, 4,
      'With "enhanced" passcode, the length is not 4');
    assert.isTrue(stubRenderUI.called, 'Not redraw after the change');
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
    subject.passcodePad.appendChild(emergencyKey);
    subject.emergencyCallBtn =
      subject.passcodePad.querySelector('a[data-key=e]');
    subject.toggleEmergencyButton();
    assert.isFalse(subject.passcodePad.querySelector('a[data-key=e]')
      .classList.contains('disabled'));
  });

  suite('Inputpad key helper functions >', function() {

    test('find the correct anchor element for touch targets', function () {
      var method = subject._anchorForTarget;
      var a = twoKey;  // key to work with is "2"
      assert.isTrue(a === method(a),
        'anchor detection fails for a level 0 target');
      assert.isTrue(a === method(a.firstElementChild),
        'anchor detection fails for a level 1 target');
      assert.isTrue(a === method(a.firstElementChild.firstElementChild),
        'anchor detection fails for a level 2 target');
      // The tested method currently only supports up to 2nd-level
      // children and we don't really care if it supports more.
      assert.isNull(method(mockHtmlKeypad),
        'anchorForTarget fails unexpectedly for top element');
      assert.isNull(method(mockHtmlKeypad.firstElementChild),
        'anchorForTarget fails unexpectedly for non-keypad element');
      assert.isNull(method(null),
        'anchorForTarget improperly handles null targets');
    });

    test('extract the correct key from touch targets', function () {
      // Get a pointer to a sub-element of mock key "2"
      var target = twoKey.firstElementChild;
      assert.isTrue('2' === subject._keyForTarget(target),
        'keyForTarget does not extract the expected key value');
      assert.isNull(subject._keyForTarget(null),
        'keyForTarget does not properly handle null targets');
    });

    test('find the correct element for touch events', function () {
      // This is not a good test, but since at this point our
      // unit testing can't fully simulate a rendered web page such
      // that document.elementFromPoint() is fully functional, all we
      // can do is check whether it is called with the expected
      // arguments.
      var stubFromPoint = sinon.stub(document, 'elementFromPoint',
        function() {
          return 'CORRECT_ELEMENT';
        });
      var event = {
        changedTouches: [
          {
            clientX: 23,
            clientY: 42
          }
        ]
      };
      var result = subject._touchTarget(event);
      assert.isTrue(stubFromPoint.calledWith(23,42),
        'touchTarget does not call .elementFromPoint() ' +
        'with expected arguments');
      assert.isTrue(result === 'CORRECT_ELEMENT',
        'touchTarget does not find the expected element');
      stubFromPoint.restore();
    });

    test('decorates active key with CSS classes', function() {
      var a = twoKey;  // anchor of key "2"
      var activeClass = 'active-key';
      a.classList.remove(activeClass);
      subject._makeKeyActive(a);
      assert.isTrue(a.classList.contains(activeClass),
        'makeActive does not add set active-key CSS class');
      subject._makeKeyInactive(a);
      assert.isFalse(a.classList.contains(activeClass),
        'makeInactive does not remove active-key CSS class');
    });

    test('correctly visualizes touchmove key transitions', function() {
      var oldTarget = twoKey;  // anchor of key "2"
      var newTarget = threeKey;  // anchor of key "3"
      var activeClass = 'active-key';
      oldTarget.classList.remove(activeClass);
      newTarget.classList.remove(activeClass);

      subject._visualizeKeypress(oldTarget);
      assert.isTrue(oldTarget.classList.contains(activeClass),
        'vizualizeKeypress does not make initial keys active');

      oldTarget.classList.remove(activeClass);
      subject._visualizeKeypress(oldTarget);
      assert.isFalse(oldTarget.classList.contains(activeClass) &&
        !newTarget.classList.contains(activeClass),
        'vizualizeKeypress changes inactive state without key change');

      oldTarget.classList.add(activeClass);
      subject._visualizeKeypress(oldTarget);
      assert.isTrue(oldTarget.classList.contains(activeClass) &&
        !newTarget.classList.contains(activeClass),
        'vizualizeKeypress changes active state without key change');

      subject._visualizeKeypress(newTarget);
      assert.isFalse(oldTarget.classList.contains(activeClass),
        'vizualizeKeypress does not make old keys inactive');
      assert.isTrue(newTarget.classList.contains(activeClass),
        'makeInactive does not make new keys active');

      subject._visualizeKeypress(null);
      assert.isFalse(newTarget.classList.contains(activeClass),
        'vizualizeKeypress does not reset active keys on null');
    });

  });

  suite('updatePassCodeUI >', function() {
    test('it would add passcode-entered class while passcode entered',
    function() {
      var method = subject.updatePassCodeUI;
      var mockSubject = {
        configs: {
          padPinLength: 4
        },
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
        configs: {
          padPinLength: 4
        },
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
          configs: {
            padPinLength: 4
          },
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
        var mockSubject = {
          configs: {
            padPinLength: 4
          },
          states: {
            passCodeEntered: '',
            passCodeErrorTimeoutPending: false
          },
          passcodePad: document.createElement('div'),
          passcodeCode: document.createElement('div')
        };
        mockSubject.passcodeCode.classList.add('error');
        subject.updatePassCodeUI.apply(mockSubject);
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

    suite('keypad input events >', function() {
      var target;
      var evt;
      var stubPreventDefault;
      var stubFromPoint;
      var spyVisualize;
      var stubVibrate;
      var stubHandleInput;

      setup(function() {
        target = mockHtmlKeypad.firstChild.children[1]; // key "2"
        evt = {
          type: 'foofoo',
          target: target,
          changedTouches: [
            {
              clientX: 23,
              clientY: 42
            }
          ],
          preventDefault: function() {}
        };
        stubPreventDefault = sinon.stub(evt, 'preventDefault');
        stubFromPoint = sinon.stub(document, 'elementFromPoint',
          function() {
            return evt.target;
          });
        // Using a spy when internal state must be updated
        // _visualizeKeypress keeps track of lastTouchedKey state
        spyVisualize = sinon.spy(subject, '_visualizeKeypress');
        stubVibrate = sinon.stub(navigator, 'vibrate');
        stubHandleInput = sinon.stub(subject, 'handlePassCodeInput');
      });

      teardown(function() {
        stubPreventDefault.restore();
        stubFromPoint.restore();
        spyVisualize.restore();
        stubVibrate.restore();
        stubHandleInput.restore();
      });

      suite('touchstart >', function() {
        setup(function() {
          evt.type = 'touchstart';
        });
        test('updates keypad', function() {
          subject.handleEvent(evt);
          assert.isTrue(spyVisualize.calledWith(evt.target),
            'does not update keypad');
        });
        test('vibrates', function() {
          subject.states.padVibrationEnabled = true;
          subject.handleEvent(evt);
          assert.isTrue(stubVibrate.called,
            'onTouchStart does not vibrate');
          stubVibrate.restore();
        });
      });

      suite('touchmove >', function() {
        setup(function() {
          evt.type = 'touchmove';
        });
        test('updates keypad', function() {
          // Call with key "2"
          subject.handleEvent(evt);
          assert.isTrue(spyVisualize.calledWith(evt.target),
            'does not update keypad');
        });
      });

      suite('touchend >', function() {
        setup(function() {
          evt.type = 'touchend';
        });
        test('prevents default click event', function() {
          subject.handleEvent(evt);
          assert.isTrue(stubPreventDefault.called,
            'does not prevent default click event');
        });
        test('updates keypad', function() {
          subject.handleEvent(evt);
          assert.isTrue(spyVisualize.calledWith(null),
            'does not update keypad');
        });
        test('handles the right key', function() {
          subject.handleEvent(evt);
          assert.isTrue(stubHandleInput.calledWith(target),
            'does not handle the expected key');
        });
      });

      suite('click >', function() {
        setup(function() {
          evt.type = 'click';
        });
        test('calls click handler', function() {
          var stubOnClick = sinon.stub(subject, 'onClick');
          evt.type = 'click';
          subject.handleEvent(evt);
          assert.isTrue(stubOnClick.calledWith(evt),
            'onClick handler is not called as expected');
          stubOnClick.restore();
        });
      });
    });

    suite('pass code input >', function() {
      var stubUpdatePassCodeUI;
      var stubInvokeSecureApp;
      var stubDispatchEvent;
      var stubCheckPassCode;

      setup(function() {

        // Build a mock lockscreen
        subject.lockScreen = {
          invokeSecureApp: function() {},
          checkPassCode: function() {},
          _unlockingMessage: {
            notificationId: 'fakeid'
          }
        };
        subject.passcodePad = { classList: new Set() };
        stubUpdatePassCodeUI = sinon.stub(subject, 'updatePassCodeUI');
        stubInvokeSecureApp =
          sinon.stub(subject.lockScreen, 'invokeSecureApp');
        stubDispatchEvent = sinon.stub(subject, 'dispatchEvent');
        stubCheckPassCode =
          sinon.stub(subject.lockScreen, 'checkPassCode');
      });

      teardown(function() {
        stubUpdatePassCodeUI.restore();
        stubInvokeSecureApp.restore();
        stubDispatchEvent.restore();
        stubCheckPassCode.restore();
      });

      test('it correctly handles key input', function() {
        subject.handlePassCodeInput(twoKey);
        assert.isTrue(subject.states.passCodeEntered === '2',
          'it does not correctly handle the first key');
        subject.handlePassCodeInput(threeKey);
        assert.isTrue(subject.states.passCodeEntered === '23',
          'it does not correctly handle the second key');
      });

      test('back key works as expected', function() {
        subject.handlePassCodeInput(twoKey);
        subject.handlePassCodeInput(threeKey);
        subject.handlePassCodeInput(backKey);
        assert.isTrue(subject.states.passCodeEntered === '2',
          'it does not correctly handle the back key');
      });

      test('it checks the pass code when it should', function() {
        subject.handlePassCodeInput(twoKey);
        subject.handlePassCodeInput(threeKey);
        subject.handlePassCodeInput(twoKey);
        subject.handlePassCodeInput(threeKey);
        assert.isTrue(stubCheckPassCode.calledWith('2323'),
          'it does not properly check the pass code');
      });

      test('it opens the emergency dialer', function() {
        subject.handlePassCodeInput(emergencyKey);
        assert.isTrue(stubInvokeSecureApp.calledWith('emergency-call'),
          'it fails to open the emergency dialer when requested');
      });

      test('it would clear notification opening ID', function() {
        subject.dispatchEvent = function() {};
        subject.handlePassCodeInput(emergencyKey);
        assert.isUndefined(
          subject.lockScreen._unlockingMessage.notificationId);
        subject.lockScreen._unlockingMessage.notificationId = 'fakeid';
        subject.handlePassCodeInput(cancelKey);
        assert.isUndefined(
          subject.lockScreen._unlockingMessage.notificationId);
      });
    });
  });
});

