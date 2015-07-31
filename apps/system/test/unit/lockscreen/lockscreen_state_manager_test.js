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
      this.init = function() {};
      this.overlay = document.createElement('div');
    };
    subject = (new LockScreenStateManager())
      .start(new mockLockScreen());
    this.sinon.stub(subject, 'resolveInnerStates', function() {
      return Promise.resolve();
    });
  });

  suite('self-test all methods: ', function() {
    test('|onPasscodeEnabledChanged| can handle delay request well',
    function(done) {
      var method = LockScreenStateManager.prototype.onPasscodeEnabledChanged;
      var mockThis = {
        lockScreenStates: {
          passcodeEnabled: new LockScreenStateManager.Deferred()
        }
      };
      mockThis.lockScreenStates.passcodeEnabled.promise.then((val) => {
        assert.equal(false, val,
          'The delay request can\'t get the reading value');
        done();
      }).catch(done);
      method.call(mockThis, false);
      assert.isFalse(mockThis.lockScreenStates.passcodeEnabled instanceof
        LockScreenStateManager.Deferred,
        'it doesn\'t replace the delay request with the read value');
      assert.equal(false, mockThis.lockScreenStates.passcodeEnabled,
        'it doesn\'t replace the delay request with the read value');
    });

    test('|resolveInnerStates| would wait all states with promises',
    function(done) {
      var method = LockScreenStateManager.prototype.resolveInnerStates;
      var Deferred = LockScreenStateManager.Deferred;
      var mockInnerStates = {
        'waiting1': new Deferred(),
        'waiting2': new Deferred()
      };
      method.call({}, mockInnerStates).then(() => {
        assert.equal(true, mockInnerStates.waiting1,
          'The method doesn\'t replace the deferred request #1 with the value');
        assert.equal(false, mockInnerStates.waiting2,
          'The method doesn\'t replace the deferred request #2 with the value');
        done();
      }).catch(done);
      assert.notEqual(true, mockInnerStates.waiting1,
        'The method doesn\'t wait the deferred request #1');
      assert.notEqual(false, mockInnerStates.waiting2,
        'The method doesn\'t wait the deferred request #1');
      mockInnerStates.waiting1.resolve(true);
      mockInnerStates.waiting2.resolve(false);
    });

    test('|transfer| would wait to resolve all deferred requests',
    function(done) {
      var method = LockScreenStateManager.prototype.transfer;
      var mockThis = {
        resolveInnerStates: this.sinon.stub().returns(Promise.resolve()),
        doTransfer: () => {}
      };
      method.call(mockThis).then(() => {
        assert.isTrue(mockThis.resolveInnerStates.called,
          'It doesn\'t wait to resolve deferred requests before transferring');
        done();
      }).catch(done);
    });

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
      subject.transfer({}).then(() => {
        assert.isTrue(stubTransferOut.called, 'the method isn\'t called');
      }).catch(done);
    });
  });

  suite('transfer while states matched: ', function() {
    test('After secure app launched, it would restore the slider',
    function(done) {
      this.sinon.stub(subject.states.slideRestore, 'transferTo',
        function() {
          // This would be the next step of 'transferOut'.
          try {
            assert.isTrue(transferOutCalled,
              'the state wasn\'t transferred from keypadShow to slideRestore');
          } catch(e) {
            done(e);
          }
          done();
        });
      var states = subject.extend(subject.lockScreenDefaultStates, {
        secureAppOpen: true
      });
      var transferOutCalled = false;
      subject.previousState = {
        transferOut: this.sinon.stub().returns(Promise.resolve().then(() => {
          transferOutCalled = true;
        })),
        type: 'keypadShow'
      };
      subject.transfer(states).catch(done);
    });

    test('With passcode enabled, when it activate to unlock, ' +
         'show the passcode pad with animation',
    function(done) {
      this.sinon.stub(subject.states.keypadRising, 'transferTo',
        function() {
          // This would be the next step of 'transferOut'.
          try {
            assert.isTrue(transferOutCalled,
              'the state wasn\'t transferred from slideShow to keypadRising');
          } catch(e) {
            done(e);
          }
          done();
        });
      var states = subject.extend(subject.lockScreenDefaultStates, {
        passcodeEnabled: true,
        passcodeTimeout: true,
        screenOn: true,
        activateUnlock: true
      });
      var transferOutCalled = false;
      subject.previousState = {
        transferOut: this.sinon.stub().returns(Promise.resolve().then(() => {
          transferOutCalled = true;
        })),
        type: 'slideShow'
      };
      subject.transfer(states).catch(done);

    });

    test('With passcode disabled, when it activate to unlock, ' +
         'unlock directly',
    function(done) {
      this.sinon.stub(subject.states.unlock, 'transferTo',
        function() {
          // This would be the next step of 'transferOut'.
          try {
            assert.isTrue(transferOutCalled,
              'the state wasn\'t transferred from slideShow to unlock');
          } catch(e) {
            done(e);
          }
          done();
        });
      var states = subject.extend(subject.lockScreenDefaultStates, {
        passcodeEnabled: false,
        screenOn: true,
        activateUnlock: true
      });
      var transferOutCalled = false;
      subject.previousState = {
        transferOut: this.sinon.stub().returns(Promise.resolve().then(() => {
          transferOutCalled = true;
        })),
        type: 'slideShow'
      };
      subject.transfer(states).catch(done);
    });

    test('With passcode enabled but not expired, when it activate to unlock, ' +
         'unlock directly',
    function(done) {
      this.sinon.stub(subject.states.slideHide, 'transferTo',
        function() {
          // This would be the next step of 'transferOut'.
          try {
            assert.isTrue(transferOutCalled,
              'the state wasn\'t transferred from slideShow to slideHide');
          } catch(e) {
            done(e);
          }
          done();
        });
      var states = subject.extend(subject.lockScreenDefaultStates, {
        passcodeEnabled: true,
        passcodeTimeout: false,
        screenOn: true,
        activateUnlock: true
      });
      var transferOutCalled = false;
      subject.previousState = {
        transferOut: this.sinon.stub().returns(Promise.resolve().then(() => {
          transferOutCalled = true;
        })),
        type: 'slideShow'
      };
      subject.transfer(states).catch(done);
    });

    test('Resume from screen off (from panelHide)',
    function(done) {
      this.sinon.stub(subject.states.slideShow, 'transferTo',
        function() {
          // This would be the next step of 'transferOut'.
          try {
            assert.isTrue(transferOutCalled,
              'the state wasn\'t transferred from panelHide to slideShow');
          } catch(e) {
            done(e);
          }
          done();
        });
      var states = subject.extend(subject.lockScreenDefaultStates, {
        screenOn: true,
        unlocking: false
      });
      var transferOutCalled = false;
      subject.previousState = {
        transferOut: this.sinon.stub().returns(Promise.resolve().then(() => {
          transferOutCalled = true;
        })),
        type: 'panelHide'
      };
      subject.transfer(states).catch(done);
    });

    test('Resume from screen off (from slideHide)',
    function(done) {
      this.sinon.stub(subject.states.slideShow, 'transferTo',
        function() {
          // This would be the next step of 'transferOut'.
          try {
            assert.isTrue(transferOutCalled,
              'the state wasn\'t transferred from slideHide to slideShow');
          } catch(e) {
            done(e);
          }
          done();
        });
      var states = subject.extend(subject.lockScreenDefaultStates, {
        screenOn: true,
        unlocking: false
      });
      var transferOutCalled = false;
      subject.previousState = {
        transferOut: this.sinon.stub().returns(Promise.resolve().then(() => {
          transferOutCalled = true;
        })),
        type: 'slideHide'
      };
      subject.transfer(states).catch(done);
    });

    test('When press homekey, show the slide with animation.',
    function(done) {
      this.sinon.stub(subject.states.keypadHiding, 'transferTo',
        function() {
          // This would be the next step of 'transferOut'.
          try {
            assert.isTrue(transferOutCalled,
              'the state wasn\'t transferred from keypadShow to keypadHiding');
          } catch(e) {
            done(e);
          }
          done();
        });
      var states = subject.extend(subject.lockScreenDefaultStates, {
        passcodeEnabled: true,
        screenOn: true,
        homePressed: true
      });
      var transferOutCalled = false;
      subject.previousState = {
        transferOut: this.sinon.stub().returns(Promise.resolve().then(() => {
          transferOutCalled = true;
        })),
        type: 'keypadShow'
      };
      subject.transfer(states).catch(done);
    });

    test('After the animation, it should show the slide to response' +
    'to the homekey pressing.',
    function(done) {
      this.sinon.stub(subject.states.slideShow, 'transferTo',
        function() {
          // This would be the next step of 'transferOut'.
          try {
            assert.isTrue(transferOutCalled,
              'the state wasn\'t transferred from keypadHiding to slideShow');
          } catch(e) {
            done(e);
          }
          done();
        });
      var states = subject.extend(subject.lockScreenDefaultStates, {
        passcodeEnabled: true,
        screenOn: true,
        inputpad: 'close',
        unlocking: false
      });
      var transferOutCalled = false;
      subject.previousState = {
        transferOut: this.sinon.stub().returns(Promise.resolve().then(() => {
          transferOutCalled = true;
        })),
        type: 'keypadHiding'
      };
      subject.transfer(states).catch(done);
    });

    test('When the screen is off, the slide should show as cache.',
    function(done) {
      this.sinon.stub(subject.states.slideShow, 'transferTo',
        function() {
          // This would be the next step of 'transferOut'.
          try {
            assert.isTrue(transferOutCalled,
              'the state wasn\'t transferred from keypadHiding to slideShow');
          } catch(e) {
            done(e);
          }
          done();
        });
      var states = subject.extend(subject.lockScreenDefaultStates, {
        screenOn: false
      });
      var transferOutCalled = false;
      subject.previousState = {
        transferOut: this.sinon.stub().returns(Promise.resolve().then(() => {
          transferOutCalled = true;
        })),
        type: 'keypadHiding'
      };
      subject.transfer(states).catch(done);
    });

    test('When the animation done, show no panel for unlocking.',
    function(done) {
      this.sinon.stub(subject.states.panelHide, 'transferTo',
        function() {
          // This would be the next step of 'transferOut'.
          try {
            assert.isTrue(transferOutCalled,
              'the state wasn\'t transferred from keypadHiding to panelHide');
          } catch(e) {
            done(e);
          }
          done();
        });
      var states = subject.extend(subject.lockScreenDefaultStates, {
        passcodeEnabled: true,
        screenOn: true,
        inputpad: 'close',
        unlocking: true
      });
      var transferOutCalled = false;
      subject.previousState = {
        transferOut: this.sinon.stub().returns(Promise.resolve().then(() => {
          transferOutCalled = true;
        })),
        type: 'keypadHiding'
      };
      subject.transfer(states).catch(done);
    });

    test('When passcode validated, transfer to keypadHide',
    function(done) {
      this.sinon.stub(subject.states.keypadHiding, 'transferTo',
        function() {
          // This would be the next step of 'transferOut'.
          try {
            assert.isTrue(transferOutCalled,
              'the state wasn\'t transferred from keypadShow to keypadHiding');
          } catch(e) {
            done(e);
          }
          done();
        });
      var states = subject.extend(subject.lockScreenDefaultStates, {
        passcodeEnabled: true,
        passcodeValidated: true,
        screenOn: true,
        inputpad: 'close',
        unlocking: true
      });
      var transferOutCalled = false;
      subject.previousState = {
        transferOut: this.sinon.stub().returns(Promise.resolve().then(() => {
          transferOutCalled = true;
        })),
        type: 'keypadShow'
      };
      subject.transfer(states).catch(done);
    });

    test('When user clean key code, hide the pad.',
    function(done) {
      this.sinon.stub(subject.states.keypadHiding, 'transferTo',
        function() {
          // This would be the next step of 'transferOut'.
          try {
            assert.isTrue(transferOutCalled,
              'the state wasn\'t transferred from keypadShow to keypadHiding');
          } catch(e) {
            done(e);
          }
          done();
        });
      var states = subject.extend(subject.lockScreenDefaultStates, {
        keypadInput: 'c'
      });
      var transferOutCalled = false;
      subject.previousState = {
        transferOut: this.sinon.stub().returns(Promise.resolve().then(() => {
          transferOutCalled = true;
        })),
        type: 'keypadShow'
      };
      subject.transfer(states).catch(done);
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
          try {
            assert.isTrue(transferOutCalled,
              'the state wasn\'t transferred from ' +
              'slideShow to secureAppLaunching');
          } catch(e) {
            done(e);
          }
          done();
        });
      var states = subject.extend(subject.lockScreenDefaultStates, {
        unlockingAppActivated: true,
        passcodeEnabled: true
      });
      var transferOutCalled = false;
      subject.previousState = {
        transferOut: this.sinon.stub().returns(Promise.resolve().then(() => {
          transferOutCalled = true;
        })),
        type: 'slideShow'
      };
      subject.transfer(states).catch(done);
    });

    test('When secure app is closing, restore the slide',
    function(done) {
      this.sinon.stub(subject.states.slideRestore, 'transferTo',
        function() {
          // This would be the next step of 'transferOut'.
          try {
            assert.isTrue(transferOutCalled,
              'the state wasn\'t transferred from ' +
              'secureAppLaunching to slidRestore');
          } catch(e) {
            done(e);
          }
          done();
        });
      var states = subject.extend(subject.lockScreenDefaultStates, {
        secureAppClose: true
      });
      var transferOutCalled = false;
      subject.previousState = {
        transferOut: this.sinon.stub().returns(Promise.resolve().then(() => {
          transferOutCalled = true;
        })),
        type: 'secureAppLaunching'
      };

      subject.transfer(states).catch(done);
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
          try {
            assert.isTrue(transferOutCalled,
              'the state wasn\'t transferred from slideShow to slideRestore');
          } catch(e) {
            done(e);
          }
          done();
        });
      var states = subject.extend(subject.lockScreenDefaultStates, {
        unlockingAppActivated: true,
        passcodeEnabled: false
      });
      var transferOutCalled = false;
      subject.previousState = {
        transferOut: this.sinon.stub().returns(Promise.resolve().then(() => {
          transferOutCalled = true;
        })),
        type: 'slideShow'
      };
      subject.transfer(states).catch(done);
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
