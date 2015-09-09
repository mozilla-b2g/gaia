'use strict';

require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_image.js');
require('/shared/test/unit/mocks/mock_canvas.js');
require('/shared/test/unit/mocks/mock_canvas_rendering_context_2d.js');
requireApp('system/lockscreen/js/lockscreen_charging.js');
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
      requireApp('system/lockscreen/js/lockscreen.js');
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
  'Clock', 'SettingsListener', 'Image', 'Canvas'
]).init();

requireApp('system/test/unit/mock_clock.js', function() {
  window.realClock = window.Clock;
  window.Clock = window.MockClock;
  requireApp('system/test/unit/mock_orientation_manager.js',
    function() {
      window.realOrientationManager = window.OrientationManager;
      window.OrientationManager = window.MockOrientationManager;
      requireApp('system/lockscreen/js/lockscreen.js');
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
    window.LockScreenMediaPlaybackWidget = function() {};
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
    subject.chargingStatus.elements.charging = document.createElement('div');

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
    this.sinon.stub(subject, 'refreshClock');
    subject.l10nInit();
    assert.isFalse(stubConnInfoManager.called,
      'the l10nInit still instantiate the conn info manager even it\'s NOT' +
      'undefined');
    window.navigator.mozMobileConnections = originalMozMobileConnections;
    window.navigator.mozL10n = originalMozl10n;
    delete subject._lockscreenConnInfoManager;
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
    assert.isTrue(!!(window.navigator.mozMobileConnections),
                  'the first condition is not satisfied: ' +
                   !!(window.navigator.mozMobileConnections));
    assert.isTrue(!subject._lockscreenConnInfoManager,
                  'the second condition is not satisfied: ' +
                  !(subject._lockscreenConnInfoManager));
    this.sinon.stub(subject, 'refreshClock');
    subject.l10nInit();
    assert.isTrue(stubConnInfoManager.called,
       'the l10nInit doesn\'t instantiate the conn info manager even it\'s ' +
       'undefined');
    window.navigator.mozMobileConnections = originalMozMobileConnections;
    window.navigator.mozL10n = originalMozl10n;
    delete subject._lockscreenConnInfoManager;
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
    subject.checkPassCode('foobar');
    assert.isTrue(stubDispatchEvent.calledWithMatch(function(event) {
      return 'lockscreen-request-passcode-validate' === event.type &&
        'foobar' === event.detail.passcode;
    }),
    'it did\'t fire the correspond event to validate the passcode');
  });

  test('When setup passcode enabled and other unlocking values reading, ' +
       'it will delay the initialization of unlocker', function(done) {
    var method = subject.setupUnlockerEvents;
    var mockThis = {
      initUnlockerEvents: this.sinon.stub(),
      setupDeferredRequest: this.sinon.stub().returns(Promise.resolve())
    };
    var check = function() {
      assert.isTrue(mockThis.initUnlockerEvents.called,
        'it did not call the unlocker initialization method');
      done();
    };
    // gjslint cannot handle promise chaining...
    var result = method.call(mockThis);
    result = result.then(check);
    result = result.catch(done);
    assert.isFalse(mockThis.initUnlockerEvents.called,
      'it did not delay the unlocker initialization method');
  });

  test('When FTU done, update the clock', function() {
    var method = subject.handleEvent;
    var mockThis = {
      refreshClock: this.sinon.stub()
    };
    method.call(mockThis, { 'type': 'ftudone' });
    assert.isTrue(mockThis.refreshClock.called);
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

  test('Handle event: when timeformat changed,' +
      'would fire event to refresh the clock',
      function() {
        var stubRefreshClock = this.sinon.stub(subject, 'refreshClock');
        subject.l10nready = true; // Or it would block the handler.
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
    var listener;
    var stubLockIfEnabled = this.sinon.stub(subject, 'lockIfEnabled');
    this.sinon.stub(subject, 'refreshClock');
    this.sinon.stub(navigator.mozSettings, 'addObserver', function(type, cb) {
      listener = cb;
    });
    subject.setupRemoteLock();
    // So we now 'triggers' it.
    listener({ settingValue: true });
    assert.isTrue(stubLockIfEnabled.calledWith(true),
      'it didn\'t lock after the lock-immediately setting got changed');
  });

  test('Refresh clock when locked via lock-immediately setting', function() {
    var listener;
    this.sinon.stub(subject, 'lockIfEnabled');
    var stubRefreshClock = this.sinon.stub(subject, 'refreshClock');
    this.sinon.stub(navigator.mozSettings, 'addObserver', function(type, cb) {
      listener = cb;
    });
    subject.setupRemoteLock();
    // So we now 'triggers' it.
    listener({ settingValue: true });
    assert.isTrue(stubRefreshClock.called,
      'it didn\'t refresh the clock after the lock-immediately event');
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
