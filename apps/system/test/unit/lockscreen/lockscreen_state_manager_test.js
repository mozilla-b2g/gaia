/* global LockScreenStateManager, Promise */

'use strict';
requireApp('system/shared/test/unit/mocks/mock_service.js');
requireApp('system/lockscreen/js/lockscreen_state_manager.js');

var mocksHelper = new window.MocksHelper([
  'Service'
]).init();

suite('system/LockScreenStateManager', function() {
  var subject;
  var mockState, mockLockScreen;
  mocksHelper.attachTestHelpers();
  setup(function() {
    var Deferred = function() {
      this.promise = new Promise((res, rej) => {
        this.resolve = res;
        this.reject = rej;
      });
      return this;
    };

    navigator.mozSettings = (function() {
      var SettingLock = function() {};
      this._deferredReadings = {};
      this._deferredObservers = {};
      this.__onsuccesses = {};
      this.createLock = () => {
        return (function() {
          this.get = (key) => {
            var lock = new SettingLock();
            navigator.mozSettings._deferredReadings[key] = new Deferred();
            navigator.mozSettings._deferredReadings[key].promise =
              navigator.mozSettings._deferredReadings[key].promise
              .then((fetchingResult) => {
                lock.result = {};
                lock.result[key] = fetchingResult;
                lock.onsuccess();
              })
              .catch(console.error.bind(console));
            return lock;
          };
          return this;
        }).call(this);
      };

      this.addObserver = (key, cb) => {
        if (!this._deferredObservers[key]) {
          this._deferredObservers[key] = new Deferred();
        }
        this._deferredObservers[key].promise =
          this._deferredObservers[key].promise.then(() => {
            cb();
          })
          .catch(console.error.bind(console));
      };
      this._reset = function() {
        this._deferredReadings = {};
        this._deferredObservers = {};
      };
      return this;
    }).call({});
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
      this.checkPassCodeTimeout = function() {};
    };
    subject = (new LockScreenStateManager())
      .start(new mockLockScreen());
    this.sinon.stub(subject, 'resolveInnerStates', function() {
      return Promise.resolve();
    });
  });

  suite('"integration tests"', function() {
    var instance;
    setup(function() {
      instance = new LockScreenStateManager();
    });
    test('if passcode setting is still reading, do not transfer ' +
         'until it is resolved', function(done) {
      var originalDoTransfer = instance.doTransfer;
      var stubDoTransfer = this.sinon.stub(instance, 'doTransfer', function() {
        originalDoTransfer.apply(instance, arguments);
      });
      instance.start(new mockLockScreen());
      var stubTransferToKeypadRising = this.sinon.stub(
          instance.states.keypadRising, 'transferTo')
        .returns(Promise.resolve());
      instance.handleEvent({type: 'lockscreenslide-activate-right'});

      sinon.assert.notCalled(stubDoTransfer,
      'it shouldn\'t transfer to next state before deferred requests resolved,'+
      'although the event comes');

      instance.promiseQueue = instance.promiseQueue.then(() => {
        sinon.assert.called(stubTransferToKeypadRising,
        'it didn\'t transfer to keypadRising after the event and settings');
        done();
      }).catch(done);
      navigator.mozSettings
        ._deferredReadings['lockscreen.passcode-lock.enabled']
        .resolve(true);
      navigator.mozSettings
        ._deferredReadings['lockscreen.passcode-lock.timeout']
        .resolve(0);
      navigator.mozSettings
        ._deferredReadings['lockscreen.unlock-sound.enabled']
        .resolve(false);
    });

    test('|holdcamera| will trigger transferring to unlock when there ' +
         'is no passcode',
    function(done) {
      instance.start(new mockLockScreen());
      var stubTransferToUnlock = this.sinon.stub(
          instance.states.unlock, 'transferTo')
        .returns(Promise.resolve());
      instance.handleEvent({type: 'holdcamera'});
      instance.promiseQueue = instance.promiseQueue.then(() => {
        sinon.assert.called(stubTransferToUnlock,
        'it didn\'t transfer to unlock after the event comes');
        done();
      }).catch(done);
      navigator.mozSettings
        ._deferredReadings['lockscreen.passcode-lock.enabled']
        .resolve(false);
      navigator.mozSettings
        ._deferredReadings['lockscreen.passcode-lock.timeout']
        .resolve(0);
      navigator.mozSettings
        ._deferredReadings['lockscreen.unlock-sound.enabled']
        .resolve(false);
    });

    test('|holdcamera| will trigger transferring to secureAppLaunching ' +
         'when there is no passcode',
    function(done) {
      instance.start(new mockLockScreen());
      var stubTransferToSecureAppLaunching= this.sinon.stub(
          instance.states.secureAppLaunching, 'transferTo')
        .returns(Promise.resolve());
      instance.handleEvent({type: 'holdcamera'});
      instance.promiseQueue = instance.promiseQueue.then(() => {
        sinon.assert.called(stubTransferToSecureAppLaunching,
        'it didn\'t transfer to secureAppLaunching after the event comes');
        done();
      }).catch(done);
      navigator.mozSettings
        ._deferredReadings['lockscreen.passcode-lock.enabled']
        .resolve(true);
      navigator.mozSettings
        ._deferredReadings['lockscreen.passcode-lock.timeout']
        .resolve(0);
      navigator.mozSettings
        ._deferredReadings['lockscreen.unlock-sound.enabled']
        .resolve(false);
    });

    test('|notification-request-activate-unlock| will trigger ' +
        'transferring to unlock when there is no passcode',
    function(done) {
      instance.start(new mockLockScreen());
      var stubTransferToUnlock = this.sinon.stub(
          instance.states.unlock, 'transferTo')
        .returns(Promise.resolve());
      instance.handleEvent(
        {type: 'lockscreen-notification-request-activate-unlock'});
      instance.promiseQueue = instance.promiseQueue.then(() => {
        sinon.assert.called(stubTransferToUnlock,
        'it didn\'t transfer to unlock after the event comes');
        done();
      }).catch(done);
      navigator.mozSettings
        ._deferredReadings['lockscreen.passcode-lock.enabled']
        .resolve(false);
      navigator.mozSettings
        ._deferredReadings['lockscreen.passcode-lock.timeout']
        .resolve(0);
      navigator.mozSettings
        ._deferredReadings['lockscreen.unlock-sound.enabled']
        .resolve(false);
    });

    test('|lockscreen-notification-request-activate-unlock| will trigger' +
         'transferring to keypadRising when there is no passcode',
    function(done) {
      instance.start(new mockLockScreen());
      var stubTransferToKeypadRising = this.sinon.stub(
          instance.states.keypadRising, 'transferTo')
        .returns(Promise.resolve());
      instance.handleEvent(
        {type: 'lockscreen-notification-request-activate-unlock'});
      instance.promiseQueue = instance.promiseQueue.then(() => {
        sinon.assert.called(stubTransferToKeypadRising,
        'it didn\'t transfer to keypadRising after the event comes');
        done();
      }).catch(done);
      navigator.mozSettings
        ._deferredReadings['lockscreen.passcode-lock.enabled']
        .resolve(true);
      navigator.mozSettings
        ._deferredReadings['lockscreen.passcode-lock.timeout']
        .resolve(0);
      navigator.mozSettings
        ._deferredReadings['lockscreen.unlock-sound.enabled']
        .resolve(false);
    });
  });

  suite('self-test all methods: ', function() {
    test('|getSettingsObserverCallback| can handle delay request well',
    function(done) {
      var method = LockScreenStateManager.prototype.getSettingsObserverCallback;
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
      method.call(mockThis, 'passcodeEnabled')({
        settingValue: false
      });
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
      // This would be the next step of 'transferOut'.
      var stubTransferTo = this.sinon.stub().returns(Promise.resolve());
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
        sinon.assert.called(stubTransferTo,
          'the |transferTo| method isn\'t called');
        sinon.assert.called(stubTransferOut,
          'the |transferOut| method isn\'t called');
      }).then(done, done);
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
        passcodeTimeoutExpired: true,
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
        passcodeEnabled: true,
        passcodeTimeoutExpired: false,
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
        passcodeEnabled: true,
        passcodeTimeoutExpired: true
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

    test('When user unlocks to app with an expired timeout, unlock it',
    function(done) {
      this.sinon.stub(subject.states.unlock, 'transferTo',
        function() {
          // This would be the next step of 'transferOut'.
          try {
            assert.isTrue(transferOutCalled,
              'the state wasn\'t transferred from ' +
              'slideShow to unlock');
          } catch(e) {
            done(e);
          }
          done();
        });
      var states = subject.extend(subject.lockScreenDefaultStates, {
        unlockingAppActivated: true,
        passcodeEnabled: true,
        passcodeTimeoutExpired: false
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

    test('When unlocking with app without passcode, unlock it',
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
