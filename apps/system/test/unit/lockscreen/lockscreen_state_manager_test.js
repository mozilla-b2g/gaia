/* global LockScreenStateManager, Promise */

'use strict';
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/shared/test/unit/mocks/mock_service.js');
requireApp('system/lockscreen/js/lockscreen_state_manager.js');

var mocksHelper = new window.MocksHelper([
  'SettingsListener', 'Service'
]).init();

suite('system/LockScreenStateManager', function() {
  var subject;
  var mockState, mockLockScreen;
  mocksHelper.attachTestHelpers();
  setup(function() {
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
    var genMock = function(type) {
      return function() {
        var neo = new mockState();
        neo.type = type;
        return neo;
      };
    };

    window.LockScreenBaseState = genMock('base');
    window.LockScreenStateSlideShow = genMock('slideShow');
    window.LockScreenStateSlideHide = genMock('slideHide');
    window.LockScreenStateUnlock = genMock('slideUnlock');
    window.LockScreenStateSlideRestore = genMock('slideRestore');
    window.LockScreenStatePanelHide = genMock('panelHide');
    window.LockScreenStateKeypadShow = genMock('keypadShow');
    window.LockScreenStateKeypadHiding = genMock('keypadHiding');
    window.LockScreenStateKeypadRising = genMock('keypadRising');
    window.LockScreenStateSecureAppLaunching = genMock('secureAppLaunching');

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
    test('After secure app launched, it would restore the slider',
    function(done) {
      this.sinon.stub(subject.states.slideRestore, 'transferTo',
        function() {
          // This would be the next step of 'transferOut'.
          done();
        });
      var states = subject.extend(subject.lockScreenDefaultStates, {
        secureAppOpen: true
      });
      subject.previousState = {
        transferOut: this.sinon.stub().returns(Promise.resolve()),
        type: 'keypadShow'
      };
      subject.transfer(states);
      assert.isTrue(subject.previousState.transferOut.called,
        'the state wasn\'t transferred from keypadShow to slideRestore');
    });

    test('With passcode enabled, when it activate to unlock, ' +
         'show the passcode pad with animation',
    function(done) {
      this.sinon.stub(subject.states.keypadRising, 'transferTo',
        function() {
          // This would be the next step of 'transferOut'.
          done();
        });
      var states = subject.extend(subject.lockScreenDefaultStates, {
        passcodeEnabled: true,
        passcodeTimeout: true,
        screenOn: true,
        activateUnlock: true
      });
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
      var states = subject.extend(subject.lockScreenDefaultStates, {
        passcodeEnabled: false,
        screenOn: true,
        activateUnlock: true
      });
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
      var states = subject.extend(subject.lockScreenDefaultStates, {
        passcodeEnabled: true,
        passcodeTimeout: false,
        screenOn: true,
        activateUnlock: true
      });
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
      var states = subject.extend(subject.lockScreenDefaultStates, {
        screenOn: true,
        unlocking: false
      });
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
      var states = subject.extend(subject.lockScreenDefaultStates, {
        screenOn: true,
        unlocking: false
      });
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
      var states = subject.extend(subject.lockScreenDefaultStates, {
        passcodeEnabled: true,
        screenOn: true,
        homePressed: true
      });
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
      var states = subject.extend(subject.lockScreenDefaultStates, {
        passcodeEnabled: true,
        screenOn: true,
        inputpad: 'close',
        unlocking: false
      });
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
      var states = subject.extend(subject.lockScreenDefaultStates, {
        screenOn: false
      });
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
      var states = subject.extend(subject.lockScreenDefaultStates, {
        passcodeEnabled: true,
        screenOn: true,
        inputpad: 'close',
        unlocking: true
      });
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
      var states = subject.extend(subject.lockScreenDefaultStates, {
        passcodeEnabled: true,
        passcodeValidated: true,
        screenOn: true,
        inputpad: 'close',
        unlocking: true
      });
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
      var states = subject.extend(subject.lockScreenDefaultStates, {
        keypadInput: 'c'
      });
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

    test('When user invoke secure app, move to the mode.',
    function(done) {
      this.sinon.stub(subject.states.secureAppLaunching, 'transferTo',
        function() {
          // This would be the next step of 'transferOut'.
          done();
        });
      var states = subject.extend(subject.lockScreenDefaultStates, {
        unlockingAppActivated: true,
        passcodeEnabled: true
      });
      subject.previousState = {
        transferOut: this.sinon.stub().returns(Promise.resolve()),
        type: 'slideShow'
      };
      subject.transfer(states);
      assert.isTrue(subject.previousState.transferOut.called,
        'the state wasn\'t transferred from slideShow to secureAppLaunching');
    });

    test('When secure app is closing, restore the slide',
    function(done) {
      this.sinon.stub(subject.states.slideRestore, 'transferTo',
        function() {
          // This would be the next step of 'transferOut'.
          done();
        });
      var states = subject.extend(subject.lockScreenDefaultStates, {
        secureAppClose: true
      });
      subject.previousState = {
        transferOut: this.sinon.stub().returns(Promise.resolve()),
        type: 'secureAppLaunching'
      };
      subject.transfer(states);
      assert.isTrue(subject.previousState.transferOut.called,
        'the state wasn\'t transferred from secureAppLaunching to slidRestore');
    });

    test('When secure app terminated, it would map to the state change',
    function() {
        var stubOnSecureAppClosing =
          this.sinon.stub(subject, 'onSecureAppClosing');
        subject.handleEvent(new CustomEvent(
          'secure-appterminated'
        ));
        assert.isTrue(stubOnSecureAppClosing.called);
      });

    test('When secure app closing, it would map to the state change',
    function() {
        var stubOnSecureAppClosing =
          this.sinon.stub(subject, 'onSecureAppClosing');
        subject.handleEvent(new CustomEvent(
          'secure-appclosing'
        ));
        assert.isTrue(stubOnSecureAppClosing.called);
      });

    test('When unlocking with app without passcode, restore the slide',
    function(done) {
      this.sinon.stub(subject.states.slideRestore, 'transferTo',
        function() {
          // This would be the next step of 'transferOut'.
          done();
        });
      var states = subject.extend(subject.lockScreenDefaultStates, {
        unlockingAppActivated: true,
        passcodeEnabled: false
      });
      subject.previousState = {
        transferOut: this.sinon.stub().returns(Promise.resolve()),
        type: 'slideShow'
      };
      subject.transfer(states);
      assert.isTrue(subject.previousState.transferOut.called,
        'the state wasn\'t transferred from slideShow to slideRestore');
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
