'use strict';

require('/shared/test/unit/mocks/mock_l10n.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_telephony.js');
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
  'Clock', 'SettingsListener'
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
  var realMozSettings;
  var domPasscodePad;
  var domEmergencyCallBtn;
  var domOverlay;
  var domPasscodeCode;
  var domMainScreen;
  var domCamera;
  var stubById;
  var domMessage;
  var mockGetAllElements;
  mocksForLockScreen.attachTestHelpers();

  setup(function() {
    stubById = sinon.stub(document, 'getElementById');
    stubById.returns(document.createElement('div'));
    mockGetAllElements = function() {
      ['area', 'areaCamera', 'areaUnlock', 'altCameraButton', 'iconContainer',
       'overlay', 'clockTime', 'date'].forEach(function(name) {
          subject[name] = document.createElement('div');
      });
    };

    window.lockScreenNotifications = {
      bindLockScreen: function() {}
    };
    window.LockScreenConnInfoManager = function() {
      this.updateConnStates = function() {};
    };
    window.MediaPlaybackWidget = function() {};
    window.SettingsURL = function() {};

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

    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = window.MockNavigatorSettings;

    subject = new window.LockScreen();

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
    domMessage = document.createElement('div');
    subject.message = domMessage;

    var mockClock = {
      start: function() {},
      stop: function() {}
    };
    subject.overlay = domOverlay;
    subject.mainScreen = domMainScreen;
    subject.clock = mockClock;
    subject.camera = domCamera;
    subject.lock();
  });

  test('Emergency call: should disable when has no telephony', function() {
    navigator.mozTelephony = null;
    var stubGetAll = this.sinon.stub(subject, 'getAllElements',
                      mockGetAllElements);
    var spyEmergencyCallEvents = this.sinon.spy(subject,
                                  'initEmergencyCallEvents');
    subject.init();
    assert.isTrue(domEmergencyCallBtn.classList.contains('disabled'));
    assert.isFalse(spyEmergencyCallEvents.calledOnce);
  });

  test('Emergency call: should enable when has telephony', function() {
    var stubGetAll = this.sinon.stub(subject, 'getAllElements',
                      mockGetAllElements);
    var spyEmergencyCallEvents = this.sinon.spy(subject,
                                  'initEmergencyCallEvents');
    subject.init();
    assert.isFalse(domEmergencyCallBtn.classList.contains('disabled'));
    assert.isTrue(spyEmergencyCallEvents.calledOnce);
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
    subject.overlay = domOverlay;
    subject.lock();
    assert.isTrue(subject.locked);
  });

  test('Unlock: can actually unlock', function() {
    subject.overlay = domOverlay;
    subject.unlock(true);
    assert.isFalse(subject.locked);
  });

  test('Passcode: enter passcode should fire the validation event', function() {
    var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');
    subject.passCodeEntered = 'foobar';
    subject.checkPassCode();
    assert.isTrue(stubDispatchEvent.calledWithMatch(function(event) {
      return 'lockscreen-request-passcode-validate' === event.type &&
        'foobar' === event.detail.passcode;
    }),
    'it did\'t fire the correspond event to validate the passcode');
  });

  test('When setup passcode enabled reading, ' +
       'it will delay the initialization of unlocker', function(done) {
    var method = subject.setupPassCodeEnabled;
    var mockThis = {
      initUnlockerEvents: this.sinon.stub()
    };
    var check = function() {
      assert.isTrue(mockThis.initUnlockerEvents.called,
        'it did not call the unlocker initialization method');
      done();
    };
    // gjslint can't handle promise chaining...
    var result = method.call(mockThis);
    result = result.then(check);
    result = result.catch(done);
    assert.isFalse(mockThis.initUnlockerEvents.called,
      'it did not delay the unlocker initialization method');
    mockThis.passCodeEnabled.resolve(true);
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

  test('Handle event: when timeformat changed,' +
      'would fire event to refresh the clock',
      function() {
        var stubRefreshClock = this.sinon.stub(subject, 'refreshClock');
        subject.handleEvent(new CustomEvent('timeformatchange'));
        assert.isTrue(stubRefreshClock.called,
          'the refreshClock wasn\'t called even after the time format changed');
      });

  test('invokeSecureApp: checking manifest and app URL of the fired Event' +
       'on secure mode',
        function() {
          var urlSamples = [
            'app://system.gaiamobile.org/index.html',
            'app://system.gaiamobile.org/index.html#'
          ];
          var expectedManifest =
            'app://system.gaiamobile.org/manifest.webapp';

          urlSamples.forEach(function(url) {
            var manifestUrl = url.replace(/(\/)*(index.html#?)*$/,
                                          '/manifest.webapp');
            assert.equal(manifestUrl, expectedManifest,
                         'the manifestURL generated is not correct');
          });
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
      subject.invokeSecureApp('camera');
      assert.isTrue(stubDispatch.calledWithMatch(sinon.match(function(e) {
          return 'secure-launchapp' === e.type;
        })),
        'the corresponding creation method was no invoked');
      stubDispatch.restore();
    });

  test('Message: message should appear on screen when set', function() {
    var message = 'message';
    subject.setLockMessage(message);
    assert.equal(subject.message.hidden, false);
    assert.equal(subject.message.textContent, message);
  });

  test('Message: message should disappear when unset', function() {
    subject.setLockMessage('');
    assert.equal(subject.message.textContent, '');
    assert.equal(subject.message.hidden, true);
  });

  test('Lock when asked via lock-immediately setting', function() {
    window.MockNavigatorSettings.mTriggerObservers(
      'lockscreen.lock-immediately', {settingValue: true});
    assert.isTrue(subject.locked,
      'it didn\'t lock after the lock-immediately setting got changed');
  });

  test('Unlock when FTU opens', function() {
    // raise an ftuopen event,
    this.sinon.stub(subject, 'unlock');
    subject.init();
    window.FtuLauncher.mIsRunning = true;
    window.dispatchEvent(new CustomEvent('ftuopen'));
    assert.isTrue(subject.unlock.calledOnce,
                  'ftuopen caused unlock to be called');
  });

  // XXX: Test 'Screen off: by proximity sensor'.

  teardown(function() {
    navigator.mozL10n = realL10n;
    navigator.mozTelephony = realMozTelephony;
    window.Clock = window.realClock;
    window.OrientationManager = window.realOrientationManager;
    window.FtuLauncher = realFtuLauncher;
    window.SettingsListener = realSettingsListener;
    navigator.mozSettings = realMozSettings;

    document.body.removeChild(domPasscodePad);
    subject.passcodePad = null;

    window.MockSettingsListener.mTeardown();
    window.MockNavigatorSettings.mTeardown();
    stubById.restore();
  });
});
