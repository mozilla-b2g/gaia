/* global LockScreenStateManager, Promise */

'use strict';
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/shared/test/unit/mocks/mock_system.js');
requireApp('system/js/lockscreen_state_manager.js');

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
    };
    window.LockScreenStateSlideShow =
    window.LockScreenStatePanelHide =
    window.LockScreenStateKeypadShow =
    window.LockScreenStateKeypadHiding =
    window.LockScreenStateKeypadRising = mockState;

    window.LockScreenStateSlideShow.type = 'slideShow';
    window.LockScreenStatePanelHide.type = 'panelHide';
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

  suite('transfer while states matched', function() {
    test('When it activate to unlock, show the passcode pad with animation',
    function() {
      var stubTransferTo = this.sinon.stub(
        subject.states.keypadRising, 'transferTo', function() {
          return new Promise((resolve, rejected) => {
            resolve();
          });
        });
      var states = {
        passcodeEnabled: true,
        screenOn: true,
        activateUnlock: true
      };
      subject.previousState = {
        type: 'slideShow'
      };
      subject.transfer(states);
      assert.isTrue(stubTransferTo.called,
        'the state wasn\'t transferred from slideShow to keypadRising');
    });

    test('Resume from screen off',
    function() {
      var stubTransferTo = this.sinon.stub(
        subject.states.slideShow, 'transferTo', function() {
          return new Promise((resolve, rejected) => {
            resolve();
          });
        });
      var states = {
        screenOn: true,
        unlocking: false
      };
      subject.previousState = {
        type: 'panelHide'
      };
      subject.transfer(states);
      assert.isTrue(stubTransferTo.called,
        'the state wasn\'t transferred from panelHide to slideShow');
    });

    test('When press homekey, show the slide with animation.',
    function() {
      var stubTransferTo = this.sinon.stub(
        subject.states.keypadHiding, 'transferTo', function() {
          return new Promise((resolve, rejected) => {
            resolve();
          });
        });
      var states = {
        passcodeEnabled: true,
        screenOn: true,
        homePressed: true
      };
      subject.previousState = {
        type: 'keypadShow'
      };
      subject.transfer(states);
      assert.isTrue(stubTransferTo.called,
        'the state wasn\'t transferred from keypadShow to keypadHiding');
    });

    test('After the animation, it should show the slide to response' +
    'to the homekey pressing.',
    function() {
      var stubTransferTo = this.sinon.stub(
        subject.states.slideShow, 'transferTo', function() {
          return new Promise((resolve, rejected) => {
            resolve();
          });
        });
      var states = {
        passcodeEnabled: true,
        screenOn: true,
        transitionEnd: true,
        unlocking: false
      };
      subject.previousState = {
        type: 'keypadHiding'
      };
      subject.transfer(states);
      assert.isTrue(stubTransferTo.called,
        'the state wasn\'t transferred from keypadHiding to slideShow');
    });

    test('When the screen is off, the slide should show as cache.',
    function() {
      var stubTransferTo = this.sinon.stub(
        subject.states.slideShow, 'transferTo', function() {
          return new Promise((resolve, rejected) => {
            resolve();
          });
        });
      var states = {
        screenOn: false
      };
      subject.previousState = {
        type: 'keypadHiding'
      };
      subject.transfer(states);
      assert.isTrue(stubTransferTo.called,
        'the state wasn\'t transferred from keypadHiding to slideShow');
    });

    test('When it unlock with passcode, hide all panel with animation.',
    function() {
      var stubTransferTo = this.sinon.stub(
        subject.states.keypadHiding, 'transferTo', function() {
          return new Promise((resolve, rejected) => {
            resolve();
          });
        });
      var states = {
        passcodeEnabled: true,
        screenOn: true,
        unlocking: true
      };
      subject.previousState = {
        type: 'keypadShow'
      };
      subject.transfer(states);
      assert.isTrue(stubTransferTo.called,
        'the state wasn\'t transferred from keypadShow to keypadHiding');
    });

    test('When the animation done, show no panel for unlocking.',
    function() {
      var stubTransferTo = this.sinon.stub(
        subject.states.panelHide, 'transferTo', function() {
          return new Promise((resolve, rejected) => {
            resolve();
          });
        });
      var states = {
        passcodeEnabled: true,
        screenOn: true,
        transitionEnd: true,
        unlocking: true
      };
      subject.previousState = {
        type: 'keypadHiding'
      };
      subject.transfer(states);
      assert.isTrue(stubTransferTo.called,
        'the state wasn\'t transferred from keypadHiding to panelHide');
    });

    test('When user input the correct key code, hide the pad.',
    function() {
      var stubTransferTo = this.sinon.stub(
        subject.states.keypadHiding, 'transferTo', function() {
          return new Promise((resolve, rejected) => {
            resolve();
          });
        });
      var states = {
        keypadInput: 'c'
      };
      subject.previousState = {
        type: 'keypadShow'
      };
      subject.transfer(states);
      assert.isTrue(stubTransferTo.called,
        'the state wasn\'t transferred from keypadShow to keypadHiding');
    });
  });
});
