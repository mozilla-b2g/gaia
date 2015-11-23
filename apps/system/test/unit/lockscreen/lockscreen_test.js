/* global MockCanvas, MockCanvasRenderingContext2D, MockImage,
          MockService, PasscodeHelper */
'use strict';

require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_image.js');
require('/shared/test/unit/mocks/mock_canvas.js');
require('/shared/test/unit/mocks/mock_canvas_rendering_context_2d.js');
require('/shared/js/passcode_helper.js');
requireApp('system/lockscreen/js/lockscreen_charging.js');
requireApp('system/shared/test/unit/mocks/mock_service.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_telephony.js');
requireApp('system/test/unit/mock_app_window.js');
requireApp('system/test/unit/mock_lockscreen_slide.js');
requireApp('system/test/unit/mock_lazy_loader.js');

var mocksForLockScreen = new window.MocksHelper([
  'AppWindow', 'LockScreenSlide', 'LazyLoader',
  'SettingsListener', 'Image', 'Canvas', 'Service'
]).init();

var stub = sinon.stub(document, 'getElementById');
stub.returns(document.createElement('div'));
requireApp('system/lockscreen/js/lockscreen.js', () => {
  stub.restore();
});

suite('system/LockScreen >', function() {
  var subject;
  var realL10n;
  var realMozTelephony;
  var realClock;
  var realSettingsListener;
  var realMozSettings;
  var domPasscodePad;
  var domEmergencyCallBtn;
  var domOverlay;
  var domPasscodeCode;
  var domMainScreen;
  var domMaskedBackground;
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

    window.LockScreenClockWidget = function() {
      this.stop = function() {
        return this;
      };
      this.start = function() {
        return this;
      };
      this.destroy = function() {
        return this;
      };
      this.next = function(cb) {
        cb();
        return this;
      };
    };

    window.lockScreenNotifications = {
      bindLockScreen: function() {}
    };
    window.LockScreenConnInfoManager = function() {
      this.updateConnStates = function() {};
    };
    window.LockScreenMediaPlaybackWidget = function() {};
    window.SettingsURL = function() {};

    realL10n = navigator.mozL10n;
    navigator.mozL10n = window.MockL10n;

    realMozTelephony = navigator.mozTelephony;
    navigator.mozTelephony = window.MockNavigatorMozTelephony;

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
    domMaskedBackground = document.createElement('div');
    domMaskedBackground.id = 'lockscreen-masked-background';
    subject.passcodePad = domPasscodePad;
    domMessage = document.createElement('div');
    subject.message = domMessage;
    subject.lockScreenClockWidget = new window.LockScreenClockWidget();

    var mockClock = {
      start: function() {},
      stop: function() {}
    };
    realClock = window.Clock;
    window.Clock = mockClock;

    subject.overlay = domOverlay;
    subject.mainScreen = domMainScreen;
    subject.maskedBackground = domMaskedBackground;
    subject.camera = domCamera;
    subject.lock();
  });

  test('L10n initialization: it should NOT init the conn info manager if ' +
       'there is already one', function() {
    var stubConnInfoManager = this.sinon.stub(window,
      'LockScreenConnInfoManager');
    var originalMozl10n = window.navigator.mozL10n;
    window.navigator.mozL10n = {
      get: function() { return ''; }
    };
    var originalMozMobileConnections = window.navigator.mozMobileConnections;
    window.navigator.mozMobileConnections = {};
    subject._lockscreenConnInfoManager = {};
    assert.isTrue(!!(window.navigator.mozMobileConnections),
                  'the first condition is not satisfied: ' +
                   !!(window.navigator.mozMobileConnections));
    assert.isTrue(!!(subject._lockscreenConnInfoManager),
                  'the second condition is not satisfied: ' +
                  !!(subject._lockscreenConnInfoManager));
    subject.l10nInit();
    assert.isFalse(stubConnInfoManager.called,
      'the l10nInit still instantiate the conn info manager even it\'s NOT' +
      'undefined');
    window.navigator.mozMobileConnections = originalMozMobileConnections;
    window.navigator.mozL10n = originalMozl10n;
    delete subject._lockscreenConnInfoManager;
  });

  test('When checkPassCodeTimeout, it would check intervals',
  function() {
    var method = window.LockScreen.prototype.checkPassCodeTimeout;
    var mockThis = {
      fetchLockedInterval: function() {},
      fetchUnlockedInterval: function() {}
    };
    var stubFetchLockedInterval = this.sinon.stub().returns(61 * 1000);
    var stubFetchUnlockedInterval = this.sinon.stub().returns(59 * 1000);
    mockThis.fetchLockedInterval = stubFetchLockedInterval;
    mockThis.fetchUnlockedInterval = stubFetchUnlockedInterval;
    assert.isTrue(method.call(mockThis, 60));
    stubFetchLockedInterval = this.sinon.stub().returns(59 * 1000);
    stubFetchUnlockedInterval = this.sinon.stub().returns(61 * 1000);
    mockThis.fetchLockedInterval = stubFetchLockedInterval;
    mockThis.fetchUnlockedInterval = stubFetchUnlockedInterval;
    assert.isTrue(method.call(mockThis, 60));
    stubFetchLockedInterval = this.sinon.stub().returns(59 * 1000);
    stubFetchUnlockedInterval = this.sinon.stub().returns(59 * 1000);
    mockThis.fetchLockedInterval = stubFetchLockedInterval;
    mockThis.fetchUnlockedInterval = stubFetchUnlockedInterval;
    assert.isFalse(method.call(mockThis, 60));
  });

  test('Fetch locked interval update the interval when it\'s still locked',
  function() {
    var method = window.LockScreen.prototype.fetchLockedInterval;
    var mockThis = {
      locked: true,
      _lastLockedInterval: -1,
      _lastLockedTimeStamp: 0
    };
    method.call(mockThis);
    assert.isTrue(mockThis._lastLockedInterval > -1);
  });

  test('Fetch locked interval update no interval after it\'s unlocked',
  function() {
    var method = window.LockScreen.prototype.fetchLockedInterval;
    var mockThis = {
      locked: false,
      _lastLockedInterval: -1,
      _lastLockedTimeStamp: 0
    };
    method.call(mockThis);
    assert.equal(mockThis._lastLockedInterval, -1);
  });

  test('Fetch unlocked interval update the interval when it\'s still unlocked',
  function() {
    var method = window.LockScreen.prototype.fetchUnlockedInterval;
    var mockThis = {
      locked: false,
      _lastUnlockedInterval: -1,
      _lastUnlockedTimeStamp: 0
    };
    method.call(mockThis);
    assert.isTrue(mockThis._lastUnlockedInterval > -1);
  });

  test('Fetch unlocked interval update no interval after it\'s locked',
  function() {
    var method = window.LockScreen.prototype.fetchUnlockedInterval;
    var mockThis = {
      locked: true,
      _lastUnlockedInterval: -1,
      _lastUnlockedTimeStamp: 0
    };
    method.call(mockThis);
    assert.equal(mockThis._lastUnlockedInterval, -1);
  });

  test('L10n initialization: it should init the conn info manager if it\'s' +
       ' undefined', function() {
    var stubConnInfoManager = this.sinon.stub(window,
      'LockScreenConnInfoManager');
    var originalMozl10n = window.navigator.mozL10n;
    window.navigator.mozL10n = {
      get: function() { return ''; }
    };
    var originalMozMobileConnections = window.navigator.mozMobileConnections;
    window.navigator.mozMobileConnections = {};
    window.SIMSlotManager = {};
    assert.isTrue(!!(window.navigator.mozMobileConnections),
                  'the first condition is not satisfied: ' +
                   !!(window.navigator.mozMobileConnections));
    assert.isTrue(!subject._lockscreenConnInfoManager,
                  'the second condition is not satisfied: ' +
                  !(subject._lockscreenConnInfoManager));
    subject.l10nInit();
    assert.isTrue(stubConnInfoManager.called,
       'the l10nInit doesn\'t instantiate the conn info manager even it\'s ' +
       'undefined');
    window.navigator.mozMobileConnections = originalMozMobileConnections;
    window.navigator.mozL10n = originalMozl10n;
    delete subject._lockscreenConnInfoManager;
  });

  test('Lock: can actually lock', function() {
    subject._lastUnlockedInterval = -1;
    subject._lastUnlockedTimeStamp = 0;
    subject._lastLockedTimeStamp = -1;

    subject.overlay = domOverlay;
    subject.locked = false;
    subject.lock();
    assert.isTrue(subject.locked);
    assert.isTrue(subject._lastUnlockedInterval > -1,
    'it didn\'t update "_lastUnlockedInterval" when ends the unlocked session');
    assert.isTrue(subject._lastLockedTimeStamp > -1,
    'it didn\'t update "_lastLockedTimeStamp" when it locks');
  });

  test('Lock: would create the clock widget', function() {
    subject.overlay = domOverlay;
    var stubCreateClockWidget = this.sinon.stub(subject, 'createClockWidget');
    MockService.mockQueryWith('screenEnabled', true);
    subject.locked = false;
    subject.lock();
    assert.isTrue(stubCreateClockWidget.called);
  });

  test('Unlock: can actually unlock', function() {
    subject._lastLockedInterval = -1;
    subject._lastLockedTimeStamp = 0;
    subject._lastUnlockedTimeStamp = -1;

    subject.overlay = domOverlay;
    subject.unlock(true);
    assert.isFalse(subject.locked);
    assert.isTrue(subject._lastLockedInterval > -1,
    'it didn\'t update "_lastLockedInterval" when it ends the locked session');
    assert.isTrue(subject._lastUnlockedTimeStamp > -1,
    'it didn\'t update "_lastUnlockedTimeStamp" when it unlocks');
  });

  test('Unlock: uses PasscodeHelper', function() {
    var StubPasscodeHelper = this.sinon.stub(PasscodeHelper, 'check',
                              function() {
      return Promise.resolve(true);
    });

    subject._lastLockedInterval = -1;
    subject._lastLockedTimeStamp = 0;
    subject._lastUnlockedTimeStamp = -1;

    subject.overlay = domOverlay;
    subject.checkPassCode('0000');
    assert.isTrue(StubPasscodeHelper.called,
      'lockscreen did not call PasscodeHelper to validate passcode');
  });

  suite('Pass code validation >', function() {

    setup(function() {
      subject.init();
    });

    test('validation fail increases error count and timeout', function() {
      subject.kPassCodeErrorCounter = 20;
      var oldTimeout = 1;
      subject.kPassCodeErrorTimeout = oldTimeout;
      subject.overlay.dataset.passcodeStatus = 'foofoo';
      subject.onPasscodeValidationFailed();
      assert.isTrue(subject.kPassCodeErrorTimeout > oldTimeout,
        'validation fail does not increase error timeout');
      assert.isTrue(subject.kPassCodeErrorCounter == 21,
        'validation fail does not increase error counter');
      assert.isTrue(subject.overlay.dataset.passcodeStatus !== 'foofoo',
        'validation fail does not change pass code error status');
    });

    test('validation success resets error count and timeout', function() {
      subject.kPassCodeErrorCounter = 20;
      var oldTimeout = 100000;
      subject.kPassCodeErrorTimeout = oldTimeout;
      subject.onPasscodeValidationSuccess();
      assert.isTrue(subject.kPassCodeErrorTimeout < oldTimeout/10,
        'validation success does not reset error timeout');
      assert.isTrue(subject.kPassCodeErrorCounter === 0,
        'validation success does not reset error counter');
    });

    test('validation fail triggers validationfailed/reset events', function() {
      subject.enabled = true;
      subject.lock();
      subject.kPassCodeErrorCounter = 0;
      subject.kPassCodeErrorTimeout = 1;
      var stubDispatch = this.sinon.stub(window, 'dispatchEvent');
      // Force setTimeout to run in sync
      var setTimeoutStub = this.sinon.stub(window, 'setTimeout', function(f){
        f();
      });
      subject.onPasscodeValidationFailed();
      assert.isTrue(stubDispatch.firstCall.calledWithMatch(sinon.match(
          function(e) {
            return e.type ===
              'lockscreen-notify-passcode-validationfailed';
          })),
        'validation fail does not trigger validationfailed as 1st event');
      assert.isTrue(stubDispatch.secondCall.calledWithMatch(sinon.match(
          function(e) {
            return e.type ===
              'lockscreen-notify-passcode-validationreset';
          })),
        'validation fail does not trigger validationreset as 2nd event');
      stubDispatch.restore();
      setTimeoutStub.restore();
    });
  });

  test('Unlock: would destroy the clock widget', function() {
    var stubDestroy = this.sinon.stub(subject.lockScreenClockWidget, 'destroy');
    subject.overlay = domOverlay;
    subject.locked = true;
    subject.unlock(true);
    assert.isTrue(stubDestroy.called);
    assert.isUndefined(subject.lockScreenClockWidget);
  });


  suite('Charging status updates', function() {
    test('When lockscreen is on, start charging status updates', function() {
      var spy = this.sinon.spy(subject.chargingStatus, 'start');
      subject.handleEvent({
        type: 'screenchange',
        detail: {screenEnabled: true}
      });

      assert.isTrue(spy.called);
      subject.chargingStatus.start.restore();
    });

    test('When lockscreen is off, stop charging status updates', function() {
      var spy = this.sinon.spy(subject.chargingStatus, 'stop');
      subject.handleEvent({
        type: 'screenchange',
        detail: {screenEnabled: false}
      });

      assert.isTrue(spy.called);
      subject.chargingStatus.stop.restore();
    });

    test('When unlocked, stop charging status updates', function() {
      var spy = this.sinon.spy(subject.chargingStatus, 'stop');
      subject.unlock();

      assert.isTrue(spy.called);
      subject.chargingStatus.stop.restore();
    });

    test('When charging starts, refresh charging status', function() {
      // we should mock navigator.battery and set charging=true and
      // see if the element's hidden is removed, but
      // navigator.battery is read only. See bug 1115921
      subject.chargingStatus.start();
      var spy = this.sinon.spy(subject.chargingStatus, 'refresh');
      navigator.battery.dispatchEvent(new CustomEvent('chargingchange', {
        charging: true
      }));

      assert.isTrue(spy.called);
      subject.chargingStatus.refresh.restore();
      subject.chargingStatus.stop();
    });

    test('When charging stops, refresh charging status', function() {
      subject.chargingStatus.start();
      var spy = this.sinon.spy(subject.chargingStatus, 'refresh');
      navigator.battery.dispatchEvent(new CustomEvent('chargingchange', {
        charging: false
      }));

      assert.isTrue(spy.called);
      subject.chargingStatus.refresh.restore();
      subject.chargingStatus.stop();
    });

    test('When charging level changes, refresh charging status', function() {
      subject.chargingStatus.start();
      var spy = this.sinon.spy(subject.chargingStatus, 'refresh');
      navigator.battery.dispatchEvent(new CustomEvent('levelchange', {
        level: 0.5
      }));

      assert.isTrue(spy.called);
      subject.chargingStatus.refresh.restore();
      subject.chargingStatus.stop();
    });

    test('When charging time changes, refresh charging status', function() {
      subject.chargingStatus.start();
      var spy = this.sinon.spy(subject.chargingStatus, 'refresh');
      navigator.battery.dispatchEvent(new CustomEvent('chargingtimechange', {
        chargeTime: 1200
      }));

      assert.isTrue(spy.called);
      subject.chargingStatus.refresh.restore();
      subject.chargingStatus.stop();
    });
  });

  suite('Handle event: screenchange should propogate to _screenEnabled prop',
    function() {
      var stubDispatch;
      setup(function() {
        stubDispatch = this.sinon.stub(window, 'dispatchEvent');
        subject._screenEnabled = undefined;
      });
      test('True', function() {
        subject.handleEvent({
          type: 'screenchange',
          detail: {screenEnabled: true}
        });
        assert.isTrue(subject._screenEnabled);
      });
      test('False', function() {
        subject.handleEvent({
          type: 'screenchange',
          detail: {screenEnabled: false}
        });
        assert.isFalse(subject._screenEnabled);
      });
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

  suite('lockscreen.lock-immediately settings observer >', function() {

    setup(function() {
      subject.init();  // to register observers
    });

    test('Locks when lock-immediately setting is set to true', function () {
      var stubDispatch = this.sinon.stub(window, 'dispatchEvent');
      subject.enabled = true;
      subject.unlock();  // or lock screen is already enabled
      window.MockSettingsListener.mTriggerCallback(
        'lockscreen.lock-immediately', true);
      assert.isTrue(stubDispatch.calledWithMatch(sinon.match(
          function(e) {
            return e.type === 'lockscreen-request-lock';
          })),
        'does not request lock after lock-immediately setting is changed');
      stubDispatch.restore();
    });

    test('resets lock/unlock timestamps', function () {
      subject.enabled = true;
      subject.passCodeEnabled = true;
      var spy = this.sinon.spy(subject, 'resetTimeoutForcibly');
      window.MockSettingsListener.mTriggerCallback(
        'lockscreen.lock-immediately', true);
      assert.isTrue(spy.called,
        'lock-immediately does not reset timestamps');
    });
  });

  test('resetTimeoutForcibly triggers password check after lock', function () {
    subject.enabled = true;
    subject.passCodeEnabled = true;
    subject.passCodeRequestTimeout = 60 * 1000;  // 60 seconds
    subject.unlock();  // or .lock() won't update timestamps
    subject.lock();
    assert.isFalse(subject.checkPassCodeTimeout(subject.passCodeRequestTimeout),
      'pass code timeout check triggers right after lock');
    subject.resetTimeoutForcibly();
    assert.isTrue(subject.checkPassCodeTimeout(subject.passCodeRequestTimeout),
      'resetTimeoutForcibly does not trigger pass code after lock');
  });

  test('Locks the screen: the overlay would be set as locked', function() {
    var method = window.LockScreen.prototype.lock;
    var stubOverlayLocked = this.sinon.stub();
    var mockThis = {
      locked: false,
      overlayLocked: stubOverlayLocked,
      playUnlockSound: function() {},
      mainScreen: document.createElement('div'),
      maskedBackground : document.createElement('div'),
      createClockWidget: function() {},
      dispatchEvent: function() {},
      _checkGenerateMaskedBackgroundColor: function() {
        return false;
      }
    };
    method.call(mockThis);
    assert.isTrue(stubOverlayLocked.called);
  });

  test('Locks the screen: plays the sound if locked', function() {
    var method = window.LockScreen.prototype.lock;
    var stubPlayUnlockedSound = this.sinon.stub();
    var mockThis = {
      locked: false,
      overlayLocked: function() {},
      playUnlockSound: stubPlayUnlockedSound,
      mainScreen: document.createElement('div'),
      createClockWidget: function() {},
      dispatchEvent: function() {},
      _checkGenerateMaskedBackgroundColor: function() {
        return false;
      }
    };
    method.call(mockThis);
    assert.isTrue(stubPlayUnlockedSound.called);
  });

  suite('Wallpaper', function() {
    test('Should update background when inited', function() {
      this.sinon.stub(subject, 'updateBackground');
      MockService.mockQueryWith('getWallpaper',
        'blob:app://wallpaper.gaiamobile.org/b10b-1d');
      subject.init();
      assert.isTrue(subject.updateBackground.calledWith(
        'blob:app://wallpaper.gaiamobile.org/b10b-1d'));
    });

    test('Should update background when wallpaper changed', function() {
      this.sinon.stub(subject, 'updateBackground');
      subject.init();
      window.dispatchEvent(new CustomEvent('wallpaperchange', {
        detail: { url: 'blob:app://wallpaper.gaiamobile.org/b10b-1d' }
      }));
      assert.isTrue(subject.updateBackground.calledWith(
        'blob:app://wallpaper.gaiamobile.org/b10b-1d'));
    });
  });

  // XXX: Test 'Screen off: by proximity sensor'.

  suite('Background functionality', function() {
    var bgURL = 'blob:app://wallpaper.gaiamobile.org/b10b-1d';

    suite('updateBackground', function() {
      var stubGenerate;

      setup(function() {
        stubGenerate =
          this.sinon.stub(subject, '_generateMaskedBackgroundColor');
      });

      test('updateBackground, Screen is not enabled and not locked',
        function() {
        subject._screenEnabled = false;
        subject.locked = false;
        subject.updateBackground(bgURL);
        var bgElem = stubById.getCall(0).returnValue;
        assert.equal(bgElem.style.backgroundImage, 'url("' + bgURL + '")');
        assert.equal(subject._regenerateMaskedBackgroundColorFrom, bgURL);
        assert.isFalse(stubGenerate.called);
        assert.isTrue(subject._shouldRegenerateMaskedBackgroundColor);
      });

      test('updateBackground, Screen is enabled and not locked', function() {
        subject._screenEnabled = true;
        subject.locked = false;
        subject.updateBackground(bgURL);
        var bgElem = stubById.getCall(0).returnValue;
        assert.equal(bgElem.style.backgroundImage, 'url("' + bgURL + '")');
        assert.equal(subject._regenerateMaskedBackgroundColorFrom, bgURL);
        assert.isFalse(stubGenerate.called);
        assert.isTrue(subject._shouldRegenerateMaskedBackgroundColor);
      });

      test('updateBackground, Screen is not enabled and is locked', function() {
        subject._screenEnabled = false;
        subject.locked = true;
        subject.updateBackground(bgURL);
        var bgElem = stubById.getCall(0).returnValue;
        assert.equal(bgElem.style.backgroundImage, 'url("' + bgURL + '")');
        assert.equal(subject._regenerateMaskedBackgroundColorFrom, bgURL);
        assert.isFalse(stubGenerate.called);
        assert.isTrue(subject._shouldRegenerateMaskedBackgroundColor);
      });

      var testScreenEnabledAndLocked = function testScreenEnabledAndLocked() {
        subject.locked = true;
        subject.updateBackground(bgURL);
        var bgElem = stubById.getCall(0).returnValue;
        assert.equal(bgElem.style.backgroundImage, 'url("' + bgURL + '")');
        assert.equal(subject._regenerateMaskedBackgroundColorFrom, bgURL);
        assert.isTrue(stubGenerate.called);
        assert.isFalse(subject._shouldRegenerateMaskedBackgroundColor);
      };

      test('updateBackground, Screen is enabled and is locked', function() {
        subject._screenEnabled = true;
        testScreenEnabledAndLocked();
      });

      test('updateBackground, _screenEnabled = undefined is regarded as ' +
           'screen is enabled', function() {
        subject._screenEnabled = undefined;
        testScreenEnabledAndLocked();
      });
    });

    test('checkGenerateMaskedBackgroundColor', function() {
      subject._shouldRegenerateMaskedBackgroundColor = true;
      subject._regenerateMaskedBackgroundColorFrom = bgURL;
      assert.isTrue(subject._checkGenerateMaskedBackgroundColor());

      subject._shouldRegenerateMaskedBackgroundColor = false;
      subject._regenerateMaskedBackgroundColorFrom = undefined;
      assert.isFalse(subject._checkGenerateMaskedBackgroundColor());
    });

    test('Lock : Removes masked Overlay if there are no notifications',
      function() {
      var method = window.LockScreen.prototype.lock;
      subject.maskedBackground.classList.add('blank');
      var mockThis = {
        locked: false,
        overlayLocked: function() {},
        mainScreen: document.createElement('div'),
        maskedBackground : subject.maskedBackground,
        createClockWidget: function() {},
        dispatchEvent: function() {},
        _checkGenerateMaskedBackgroundColor: function() {
          return false;
        }
      };
      method.call(mockThis);
      assert.strictEqual(subject.maskedBackground.style.backgroundColor,
        'transparent');
    });

    suite('generateMaskedBackgroundColor', function() {
      // unit-test the function is a bit tricky: first we use the mocked image
      // object (and set fake height/width). then we use the mocked canvas
      // object that returns a image data that would calculate into red
      // (#ff0000), green (#00ff00), and blue (#0000ff) for each of the three
      // tests respectively, and we match the calculatd hsl against the known
      // result.
      // i.e. the image src fed into the function is actually not used in the
      // calculation, for the test's sake.

      var mockCanvas;
      var mockContext;
      var mockBgElem;
      var img;
      var canvasWidth;
      var canvasHeight;
      var fakeImageData;

      setup(function() {
        mockCanvas = new MockCanvas();
        this.sinon.stub(document, 'createElement').returns(mockCanvas);

        mockContext = new MockCanvasRenderingContext2D();

        mockBgElem = {
          dataset: {},
          classList: {
            contains: this.sinon.stub().returns(true)
          },
          style: {}
        };

        subject.maskedBackground = mockBgElem;

        MockImage.teardown();

        subject._regenerateMaskedBackgroundColorFrom = bgURL;
        subject._generateMaskedBackgroundColor();

        assert.isFalse(subject._shouldRegenerateMaskedBackgroundColor);
        assert.strictEqual(
          subject._regenerateMaskedBackgroundColorFrom,
          undefined
        );

        img = MockImage.instances[0];
        img.width = 100;
        img.height = 100;

        canvasWidth = img.width * window.devicePixelRatio;
        canvasHeight = img.height * window.devicePixelRatio;

        this.sinon.stub(mockCanvas, 'getContext').returns(mockContext);

        // fill the fake imagedata with all red
        fakeImageData = [];
      });

      test('red', function() {
        for (var row = 0; row < canvasHeight; row++) {
          for (var col = 0; col < canvasWidth; col++) {
            fakeImageData[((canvasWidth * row) + col) * 4] = 255; // r
            fakeImageData[((canvasWidth * row) + col) * 4 + 1] = 0; // g
            fakeImageData[((canvasWidth * row) + col) * 4 + 2] = 0; // b
          }
        }

        this.sinon.stub(mockContext, 'getImageData').returns({
          data: fakeImageData
        });

        img.triggerEvent('onload');

        assert.equal(
          mockBgElem.dataset.wallpaperColor,
          'hsla(0, 100%, 45%, 0.7)'
        );
        assert.isFalse('backgroundColor' in mockBgElem.style);
      });

      test('green', function() {
        for (var row = 0; row < canvasHeight; row++) {
          for (var col = 0; col < canvasWidth; col++) {
            fakeImageData[((canvasWidth * row) + col) * 4] = 0; // r
            fakeImageData[((canvasWidth * row) + col) * 4 + 1] = 255; // g
            fakeImageData[((canvasWidth * row) + col) * 4 + 2] = 0; // b
          }
        }

        this.sinon.stub(mockContext, 'getImageData').returns({
          data: fakeImageData
        });

        img.triggerEvent('onload');

        assert.equal(
          mockBgElem.dataset.wallpaperColor,
          'hsla(120, 100%, 45%, 0.7)'
        );
        assert.isFalse('backgroundColor' in mockBgElem.style);
      });

      test('blue', function() {
        for (var row = 0; row < canvasHeight; row++) {
          for (var col = 0; col < canvasWidth; col++) {
            fakeImageData[((canvasWidth * row) + col) * 4] = 0; // r
            fakeImageData[((canvasWidth * row) + col) * 4 + 1] = 0; // g
            fakeImageData[((canvasWidth * row) + col) * 4 + 2] = 255; // b
          }
        }

        this.sinon.stub(mockContext, 'getImageData').returns({
          data: fakeImageData
        });

        img.triggerEvent('onload');

        assert.equal(
          mockBgElem.dataset.wallpaperColor,
          'hsla(240, 100%, 45%, 0.7)'
        );
        assert.isFalse('backgroundColor' in mockBgElem.style);
      });

      test('red & update background style directly', function() {
        for (var row = 0; row < canvasHeight; row++) {
          for (var col = 0; col < canvasWidth; col++) {
            fakeImageData[((canvasWidth * row) + col) * 4] = 255; // r
            fakeImageData[((canvasWidth * row) + col) * 4 + 1] = 0; // g
            fakeImageData[((canvasWidth * row) + col) * 4 + 2] = 0; // b
          }
        }

        this.sinon.stub(mockContext, 'getImageData').returns({
          data: fakeImageData
        });

        mockBgElem.classList.contains.returns(false);

        img.triggerEvent('onload');

        assert.isTrue(mockBgElem.classList.contains.calledWith('blank'));
        assert.equal(
          mockBgElem.style.backgroundColor,
          'hsla(0, 100%, 45%, 0.7)'
        );
      });
    });
  });

  teardown(function() {
    navigator.mozL10n = realL10n;
    navigator.mozTelephony = realMozTelephony;
    window.Clock = realClock;
    window.SettingsListener = realSettingsListener;
    navigator.mozSettings = realMozSettings;

    document.body.removeChild(domPasscodePad);
    subject.passcodePad = null;

    window.MockSettingsListener.mTeardown();
    window.MockNavigatorSettings.mTeardown();
    stubById.restore();
  });
});
