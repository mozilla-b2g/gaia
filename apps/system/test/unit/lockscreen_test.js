'use strict';

mocha.globals(['SecureWindowManager', 'SecureWindowFactory', 'LockScreen',
               'LockScreenSlide', 'Clock', 'OrientationManager',
               'addEventListener', 'dispatchEvent', 'secureWindowManager',
               'secureWindowFactory']);

requireApp('system/test/unit/mock_l10n.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/test/unit/mock_navigator_moz_telephony.js');
requireApp('system/test/unit/mock_ftu_launcher.js');
requireApp('system/test/unit/mock_app_window_manager.js');
requireApp('system/test/unit/mock_app_window.js');
requireApp('system/test/unit/mock_lockscreen_slide.js');
requireApp('system/test/unit/mock_clock.js', function() {
  window.realClock = window.Clock;
  window.Clock = window.MockClock;
  requireApp('system/test/unit/mock_orientation_manager.js',
    function() {
      window.realOrientationManager = window.OrientationManager;
      window.OrientationManager = window.MockOrientationManager;
      requireApp('system/js/lockscreen.js');
    });
});

if (!this.FtuLauncher) {
  this.FtuLauncher = null;
}

if (!this.SettingsListener) {
  this.SettingsListener = null;
}

var mocksForLockScreen = new window.MocksHelper([
  'OrientationManager', 'AppWindowManager', 'AppWindow', 'LockScreenSlide',
  'Clock'
]).init();

requireApp('system/test/unit/mock_clock.js', function() {
  window.realClock = window.Clock;
  window.Clock = window.MockClock;
  requireApp('system/test/unit/mock_orientation_manager.js',
    function() {
      window.realOrientationManager = window.OrientationManager;
      window.OrientationManager = window.MockOrientationManager;
      requireApp('system/js/lockscreen.js');
    });
});

suite('system/LockScreen >', function() {
  var subject;
  var realL10n;
  var realMozTelephony;
  var realClock;
  var realOrientationManager;
  var realFtuLauncher;
  var realSettingsListener;
  var domPasscodePad;
  var domEmergencyCallBtn;
  var domOverlay;
  var domPasscodeCode;
  var domMainScreen;
  var domCamera;
  mocksForLockScreen.attachTestHelpers();

  setup(function() {
    subject = window.LockScreen;
    realL10n = navigator.mozL10n;
    navigator.mozL10n = window.MockL10n;

    realMozTelephony = navigator.mozTelephony;
    navigator.mozTelephony = window.MockNavigatorMozTelephony;

    realClock = window.Clock;
    window.Clock = window.MockClock;

    realOrientationManager = window.OrientationManager;
    window.OrientationManager = window.MockOrientationManager;

    realFtuLauncher = window.FtuLauncher;
    window.FtuLauncher = window.MockFtuLauncher;

    realSettingsListener = window.SettingsListener;
    window.SettingsListener = window.MockSettingsListener;

    domCamera = document.createElement('div');
    domPasscodePad = document.createElement('div');
    domPasscodePad.id = 'lockscreen-passcode-pad';
    domEmergencyCallBtn = document.createElement('a');
    domEmergencyCallBtn.dataset.key = 'e';
    domPasscodePad.appendChild(domEmergencyCallBtn);
    domOverlay = document.createElement('div');
    domPasscodeCode = document.createElement('div');
    document.body.appendChild(domPasscodePad);
    domMainScreen = document.createElement('div');
    subject.passcodePad = domPasscodePad;

    var mockClock = {
      stop: function() {}
    };
    subject.overlay = domOverlay;
    subject.mainScreen = domMainScreen;
    subject.clock = mockClock;
    subject.camera = domCamera;
    subject.lock();
  });

  test('Emergency call: should disable emergency-call button',
    function() {
      var stubSwitchPanel = this.sinon.stub(subject, 'switchPanel');
      navigator.mozTelephony.calls = {length: 1};
      var evt = {type: 'callschanged'};
      subject.handleEvent(evt);
      assert.isTrue(domEmergencyCallBtn.classList.contains('disabled'));
      stubSwitchPanel.restore();
  });

  test('Emergency call: should enable emergency-call button',
    function() {
      var stubSwitchPanel = this.sinon.stub(subject, 'switchPanel');
      navigator.mozTelephony.calls = {length: 0};
      var evt = {type: 'callschanged'};
      subject.handleEvent(evt);
      assert.isFalse(domEmergencyCallBtn.classList.contains('disabled'));
      stubSwitchPanel.restore();
  });

  test('Lock: can actually lock', function() {
    var mockLO = sinon.stub(screen, 'mozLockOrientation');
    subject.overlay = domOverlay;
    subject.lock();
    assert.isTrue(subject.locked);
    mockLO.restore();
  });

  test('Unlock: can actually unlock', function() {
    subject.overlay = domOverlay;
    subject.unlock(true);
    assert.isFalse(subject.locked);
  });

  test('Passcode: enter passcode can unlock the screen', function() {
    subject.passCodeEntered = '0000';
    subject.passCode = '0000';
    subject.passcodeCode = domPasscodeCode;
    subject.checkPassCode();
    assert.equal(subject.overlay.dataset.passcodeStatus, 'success');
  });

  test('Passcode: enter passcode can unlock the screen', function() {
    subject.passCodeEntered = '0000';
    subject.passCode = '3141';

    subject.passcodeCode = domPasscodeCode;
    subject.checkPassCode();
    assert.equal(subject.overlay.dataset.passcodeStatus, 'error');
  });

  test('Handle event: when screen changed,' +
      'would fire event to kill all secure apps',
      function() {
        var stubDispatch = this.sinon.stub(window, 'dispatchEvent');
        subject.handleEvent({type: 'screenchange', detail: {}});
        assert.isTrue(stubDispatch.calledWithMatch(sinon.match(
              function(e) {
                return e.type === 'secure-killapps';
              })),
          'the event was not fired');
        stubDispatch.restore();
      });

  test('Handle event: when press home,' +
      'would fire event to close all secure apps',
      function() {
        subject.lock();
        var stubDispatch = this.sinon.stub(window, 'dispatchEvent');
        subject.handleEvent({type: 'home', detail: {},
          stopImmediatePropagation: function() {}});
        assert.isTrue(stubDispatch.calledWithMatch(sinon.match(
              function(e) {
                return e.type === 'secure-closeapps';
              })),
          'the event was not fired');
        stubDispatch.restore();
      });

  test('Handle event: when unlock,' +
      'would fire event to turn secure mode off',
      function() {
        var stubDispatch = this.sinon.stub(window, 'dispatchEvent');
        subject.unlock();
        assert.isTrue(stubDispatch.calledWithMatch(sinon.match(
              function(e) {
                return e.type === 'secure-modeoff';
              })),
          'the event was not fired');
        stubDispatch.restore();
      });

  test('Handle event: when lock,' +
      'would fire event to turn secure mode on',
      function() {
        subject.unlock();
        var stubDispatch = this.sinon.stub(window, 'dispatchEvent');
        subject.lock();
        assert.isTrue(stubDispatch.calledWithMatch(sinon.match(
              function(e) {
                return e.type === 'secure-modeon';
              })),
          'the event was not fired');
        stubDispatch.restore();
      });

  test('Switch panel: to Camera; should notify SecureWindowFactory\'s method',
    function() {
      var stubDispatch = this.sinon.stub(window, 'dispatchEvent');
      subject.loadPanel('camera', function() {});
      assert.isTrue(stubDispatch.calledWithMatch(sinon.match(function(e) {
          return 'secure-launchapp' === e.type;
        })),
        'the corresponding creation method was no invoked');
      stubDispatch.restore();
    });

  // XXX: Test 'Screen off: by proximity sensor'.

  teardown(function() {
    navigator.mozL10n = realL10n;
    navigator.mozTelephony = realMozTelephony;
    window.Clock = window.realClock;
    window.OrientationManager = window.realOrientationManager;
    window.FtuLauncher = realFtuLauncher;
    window.OrientationManager = window.realOrientationManager;
    window.SettingsListener = realSettingsListener;

    document.body.removeChild(domPasscodePad);
    subject.passcodePad = null;

    window.MockSettingsListener.mTeardown();
  });
});
