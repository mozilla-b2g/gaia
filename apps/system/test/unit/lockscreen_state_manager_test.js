/* global LockScreenStateManager, Promise */

'use strict';
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/shared/test/unit/mocks/mock_system.js');
requireApp('system/lockscreen/js/lockscreen_state_manager.js');

var mocksHelper = new window.MocksHelper([
  'SettingsListener', 'System'
]).init();

suite('system/LockScreenStateManager', function() {
  var subject;
  var mockState, mockLockScreen;
  mocksHelper.attachTestHelpers();
  setup(function() {
    window.System.locked = true;
    mockState = function() {
      this.start = () => {
        return this; };
      this.transferTo = () => {
        return new Promise((resolve, reject) => {
          resolve();
        });
      };
      this.transferOut = () => {
        return new Promise((resolve, reject) => {
          resolve();
        });
      };
    };
    window.LockScreenBaseState =
    window.LockScreenStateSlideShow =
    window.LockScreenStateSlideHide =
    window.LockScreenStatePanelHide =
    window.LockScreenStateUnlock =
    window.LockScreenStateKeypadShow =
    window.LockScreenStateKeypadHiding =
    window.LockScreenStateKeypadRising = mockState;

    window.LockScreenStateSlideShow.type = 'slideShow';
    window.LockScreenStatePanelHide.type = 'panelHide';
    window.LockScreenStateUnlock.type = 'unlock';
    window.LockScreenStateKeypadShow.type = 'keypadShow';
    window.LockScreenStateKeypadHiding.type = 'keypadHiding';
    window.LockScreenStateKeypadRising.type = 'keypadRising';

    window.LockScreenStateLogger = function() {
      this.start =
      this.stop =
      this.stack =
      this.debug =
      this.error =
      this.warning =
      this.verbose =
      this.transfer = function() {
        return this;
      };
    };

    mockLockScreen = function() {
      this.overlay = document.createElement('div');
    };

    subject = (new LockScreenStateManager())
      .start(new mockLockScreen());
  });

  suite('self-test all methods', function() {
    test('|transfer| would call transferTo and transferOut of the state',
    function(done) {
      var stubTransferOut = this.sinon.stub().returns(Promise.resolve());
      var stubTransferTo = this.sinon.stub().returns(new Promise(() => {
        // This would be the next step of 'transferOut'.
        done();
      }));
      subject.rules = new Map();
      subject.previousState = {
        transferOut: stubTransferOut,
        transferTo: stubTransferTo,
        type: 'foo'
      };
      subject.rules.set({}, {
        transferOut: stubTransferOut,
        transferTo: stubTransferTo,
        type: 'bar'
      });

      this.sinon.stub(subject, 'matchAcceptableState', function() {
        return true;
      });
      this.sinon.stub(subject, 'matchStates', function() {
        return true;
      });
      subject.transfer();
      assert.isTrue(stubTransferOut.called, 'the method isn\'t called');
    });
  });

  suite('transfer while states matched', function() {
    test('With passcode enabled, when it activate to unlock, ' +
         'show the passcode pad with animation',
    function(done) {
      this.sinon.stub(subject.states.keypadRising, 'transferTo',
        function() {
          // This would be the next step of 'transferOut'.
          done();
        });
      var states = {
        passcodeEnabled: true,
        passcodeTimeout: true,
        screenOn: true,
        activateUnlock: true
      };
      subject.previousState = {
        transferOut: this.sinon.stub().returns(Promise.resolve()),
        type: 'slideShow'
      };
      subject.transfer(states);
      assert.isTrue(subject.previousState.transferOut.called,
        'the state wasn\'t transferred from slideShow to keypadRising');
    });

    test('With passcode disabled, when it activate to unlock, ' +
         'unlock directly',
    function(done) {
      this.sinon.stub(subject.states.slideHide, 'transferTo',
        function() {
          // This would be the next step of 'transferOut'.
          done();
        });
      var states = {
        passcodeEnabled: false,
        screenOn: true,
        activateUnlock: true
      };
      subject.previousState = {
        transferOut: this.sinon.stub().returns(Promise.resolve()),
        type: 'slideShow'
      };
      subject.transfer(states);
      assert.isTrue(subject.previousState.transferOut.called,
        'the state wasn\'t transferred from slideShow to slideHide');
    });

    test('With passcode enabled but not expired, when it activate to unlock, ' +
         'unlock directly',
    function(done) {
      this.sinon.stub(subject.states.slideHide, 'transferTo',
        function() {
          // This would be the next step of 'transferOut'.
          done();
        });
      var states = {
        passcodeEnabled: true,
        passcodeTimeout: false,
        screenOn: true,
        activateUnlock: true
      };
      subject.previousState = {
        transferOut: this.sinon.stub().returns(Promise.resolve()),
        type: 'slideShow'
      };
      subject.transfer(states);
      assert.isTrue(subject.previousState.transferOut.called,
        'the state wasn\'t transferred from slideShow to slideHide');
    });

    test('Resume from screen off (from panelHide)',
    function(done) {
      this.sinon.stub(subject.states.slideShow, 'transferTo',
        function() {
          // This would be the next step of 'transferOut'.
          done();
        });
      var states = {
        screenOn: true,
        unlocking: false
      };
      subject.previousState = {
        transferOut: this.sinon.stub().returns(Promise.resolve()),
        type: 'panelHide'
      };
      subject.transfer(states);
      assert.isTrue(subject.previousState.transferOut.called,
        'the state wasn\'t transferred from panelHide to slideShow');
    });

    test('Resume from screen off (from slideHide)',
    function(done) {
      this.sinon.stub(subject.states.slideShow, 'transferTo',
        function() {
          // This would be the next step of 'transferOut'.
          done();
        });
      var states = {
        screenOn: true,
        unlocking: false
      };
      subject.previousState = {
        transferOut: this.sinon.stub().returns(Promise.resolve()),
        type: 'slideHide'
      };
      subject.transfer(states);
      assert.isTrue(subject.previousState.transferOut.called,
        'the state wasn\'t transferred from slideHide to slideShow');
    });

    test('When press homekey, show the slide with animation.',
    function(done) {
      this.sinon.stub(subject.states.keypadHiding, 'transferTo',
        function() {
          // This would be the next step of 'transferOut'.
          done();
        });
      var states = {
        passcodeEnabled: true,
        screenOn: true,
        homePressed: true
      };
      subject.previousState = {
        transferOut: this.sinon.stub().returns(Promise.resolve()),
        type: 'keypadShow'
      };
      subject.transfer(states);
      assert.isTrue(subject.previousState.transferOut.called,
        'the state wasn\'t transferred from keypadShow to keypadHiding');
    });

    test('After the animation, it should show the slide to response' +
    'to the homekey pressing.',
    function(done) {
      this.sinon.stub(subject.states.slideShow, 'transferTo',
        function() {
          // This would be the next step of 'transferOut'.
          done();
        });
      var states = {
        passcodeEnabled: true,
        screenOn: true,
        transitionEnd: true,
        unlocking: false
      };
      subject.previousState = {
        transferOut: this.sinon.stub().returns(Promise.resolve()),
        type: 'keypadHiding'
      };
      subject.transfer(states);
      assert.isTrue(subject.previousState.transferOut.called,
        'the state wasn\'t transferred from keypadHiding to slideShow');
    });

    test('When the screen is off, the slide should show as cache.',
    function(done) {
      this.sinon.stub(subject.states.slideShow, 'transferTo',
        function() {
          // This would be the next step of 'transferOut'.
          done();
        });
      var states = {
        screenOn: false
      };
      subject.previousState = {
        transferOut: this.sinon.stub().returns(Promise.resolve()),
        type: 'keypadHiding'
      };
      subject.transfer(states);
      assert.isTrue(subject.previousState.transferOut.called,
        'the state wasn\'t transferred from keypadHiding to slideShow');
    });

    test('When the animation done, show no panel for unlocking.',
    function(done) {
      this.sinon.stub(subject.states.panelHide, 'transferTo',
        function() {
          // This would be the next step of 'transferOut'.
          done();
        });
      var states = {
        passcodeEnabled: true,
        screenOn: true,
        transitionEnd: true,
        unlocking: true
      };
      subject.previousState = {
        transferOut: this.sinon.stub().returns(Promise.resolve()),
        type: 'keypadHiding'
      };
      subject.transfer(states);
      assert.isTrue(subject.previousState.transferOut.called,
        'the state wasn\'t transferred from keypadHiding to panelHide');
    });

    test('When passcode validated, transfer to keypadHide',
    function(done) {
      this.sinon.stub(subject.states.keypadHiding, 'transferTo',
        function() {
          // This would be the next step of 'transferOut'.
          done();
        });
      var states = {
        passcodeEnabled: true,
        passcodeValidated: true,
        screenOn: true,
        unlocking: true
      };
      subject.previousState = {
        transferOut: this.sinon.stub().returns(Promise.resolve()),
        type: 'keypadShow'
      };
      subject.transfer(states);
      assert.isTrue(subject.previousState.transferOut.called,
        'the state wasn\'t transferred from keypadShow to keypadHiding');
    });

    test('When user clean key code, hide the pad.',
    function(done) {
      this.sinon.stub(subject.states.keypadHiding, 'transferTo',
        function() {
          // This would be the next step of 'transferOut'.
          done();
        });
      var states = {
        keypadInput: 'c'
      };
      subject.previousState = {
        transferOut: this.sinon.stub().returns(Promise.resolve()),
        type: 'keypadShow'
      };
      subject.transfer(states);
      assert.isTrue(subject.previousState.transferOut.called,
        'the state wasn\'t transferred from keypadShow to keypadHiding');
    });

    test('When screenchanged, the unlocking value should be false.',
    function() {
      subject.handleEvent({
        type: 'screenchange', detail: {
          screenEnabled: false
        }
      });
      this.sinon.stub(subject, 'transfer');
      assert.isFalse(subject.lockScreenStates.unlocking,
        'the screenchange event doesn\'t restore the unlocking state');
    });

    test('When actionable noitification want to unlock, ' +
         'it would trigger activate unlock',
    function() {
      var stubOnActiveUnlock = this.sinon.stub(subject, 'onActivateUnlock');
      subject.handleEvent({
        type: 'lockscreen-notification-request-activate-unlock'
      });
      assert.isTrue(stubOnActiveUnlock.called,
        'the handler didn\'t handle the event');
    });
  });
});
