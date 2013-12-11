'use strict';
requireApp('system/test/unit/mock_clock.js', function() {
  window.realClock = window.Clock;
  window.Clock = MockClock;
  window.realOrientationManager = window.OrientationManager;
  window.OrientationManager = {
    defaultOrientation: null
  };
requireApp('system/js/lockscreen.js');
});

requireApp('system/test/unit/mock_l10n.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/test/unit/mock_navigator_moz_telephony.js');
requireApp('system/test/unit/mock_ftu_launcher.js');

if (!this.FtuLauncher) {
  this.FtuLauncher = null;
}

if (!this.SettingsListener) {
  this.SettingsListener = null;
}

suite('system/LockScreen >', function() {
  var subject;
  var realOrientationManager;
  var realL10n;
  var realMozTelephony;
  var realClock;
  var realFtuLauncher;
  var realSettingsListener;
  var domPasscodePad;
  var domEmergencyCallBtn;
  var domOverlay;
  var domPasscodeCode;
  var domMainScreen;
  var DUMMYTEXT1 = 'foo';

  setup(function() {
    subject = window.LockScreen;
    realL10n = navigator.mozL10n;
    navigator.mozL10n = window.MockL10n;

    realOrientationManager = window.OrientationManager;
    window.OrientationManager = {
      defaultOrientation: null
    };

    realMozTelephony = navigator.mozTelephony;
    navigator.mozTelephony = window.MockNavigatorMozTelephony;

    realClock = window.Clock;
    window.Clock = MockClock;

    realFtuLauncher = window.FtuLauncher;
    window.FtuLauncher = MockFtuLauncher;

    realSettingsListener = window.SettingsListener;
    window.SettingsListener = MockSettingsListener;

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

  // XXX: Test 'Screen off: by proximity sensor'.

  teardown(function() {
    navigator.mozL10n = realL10n;
    navigator.mozTelephony = realMozTelephony;
    window.Clock = window.realClock;
    window.FtuLauncher = realFtuLauncher;
    window.OrientationManager = window.realOrientationManager;
    window.SettingsListener = realSettingsListener;

    document.body.removeChild(domPasscodePad);
    subject.passcodePad = null;

    MockSettingsListener.mTeardown();
  });
});
