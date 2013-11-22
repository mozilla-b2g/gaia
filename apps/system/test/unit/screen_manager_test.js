'use strict';

mocha.globals(['SettingsListener', 'LockScreen', 'Bluetooth', 'StatusBar',
      'AttentionScreen', 'removeEventListener', 'addEventListener',
      'ScreenManager', 'clearIdleTimeout', 'setIdleTimeout', 'dispatchEvent',
      'WindowManager']);

requireApp('system/test/unit/mock_window_manager.js');
requireApp('system/test/unit/mock_navigator_moz_power.js');
requireApp('system/test/unit/mock_sleep_menu.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');

function switchProperty(originObject, prop, stub, reals, useDefineProperty) {
  if (!useDefineProperty) {
    reals[prop] = originObject[prop];
    originObject[prop] = stub;
  } else {
    Object.defineProperty(originObject, prop, {
      configurable: true,
      get: function() { return stub; }
    });
  }
}

function restoreProperty(originObject, prop, reals, useDefineProperty) {
  if (!useDefineProperty) {
    originObject[prop] = reals[prop];
  } else {
    Object.defineProperty(originObject, prop, {
      configurable: true,
      get: function() { return reals[prop]; }
    });
  }
}

suite('system/ScreenManager', function() {
  var reals = {};

  setup(function(done) {
    switchProperty(navigator, 'mozPower', MockMozPower, reals, true);
    switchProperty(window, 'WindowManager', MockWindowManager, reals);
    switchProperty(window, 'SettingsListener', MockSettingsListener, reals);
    this.sinon.useFakeTimers();

    // We make sure fake timers are in place before we require the app
    requireApp('system/js/screen_manager.js', done);
  });

  teardown(function() {
    MockMozPower.mTeardown();
    MockWindowManager.mTeardown();
    MockSettingsListener.mTeardown();
    restoreProperty(navigator, 'mozPower', reals, true);
    restoreProperty(window, 'WindowManager', reals);
    restoreProperty(window, 'SettingsListener', reals);
  });

  suite('init()', function() {
    setup(function() {
      var stubTelephony = {};
      var stubLockscreen = {};
      var stubById = this.sinon.stub(document, 'getElementById');
      stubById.withArgs('screen').returns(document.createElement('div'));

      this.sinon.stub(MockSettingsListener, 'observe');
      stubTelephony.addEventListener = this.sinon.stub();
      stubLockscreen.locked = true;

      this.sinon.stub(ScreenManager, 'turnScreenOn');
      this.sinon.stub(ScreenManager, '_reconfigScreenTimeout');
      this.sinon.stub(ScreenManager, '_setIdleTimeout');

      switchProperty(navigator, 'mozTelephony', stubTelephony, reals);
      switchProperty(window, 'LockScreen', stubLockscreen, reals);
    });

    teardown(function() {
      restoreProperty(navigator, 'mozTelephony', reals);
      restoreProperty(window, 'LockScreen', reals);
    });

    test('Event listener adding', function() {
      var eventListenerStub = this.sinon.stub(window, 'addEventListener');
      ScreenManager.init();
      assert.isTrue(eventListenerStub.withArgs('sleep').calledOnce);
      assert.isTrue(eventListenerStub.withArgs('wake').calledOnce);
      assert.isTrue(eventListenerStub.withArgs('requestshutdown').calledOnce);
    });

    suite('power.addWakeLockListener handling', function() {
      var wakeLockListenerSpy;

      setup(function() {
        wakeLockListenerSpy = this.sinon.spy(MockMozPower,
                                             'addWakeLockListener');
        ScreenManager.init();
      });

      test('General case', function() {
        wakeLockListenerSpy.yield('screen', 'locked-foreground');
        assert.isTrue(ScreenManager._screenWakeLocked);
        assert.isTrue(ScreenManager.turnScreenOn.called);
        assert.isTrue(ScreenManager._reconfigScreenTimeout.called);
      });

      test('Called with topic "screen"', function() {
        ScreenManager.turnScreenOn.reset();
        wakeLockListenerSpy.yield('screen', 'locked-background');
        assert.isFalse(ScreenManager._screenWakeLocked);
        assert.isFalse(ScreenManager.turnScreenOn.called);
        assert.isTrue(ScreenManager._reconfigScreenTimeout.called);
      });

      suite('Called with topic topic "cpu"', function() {
        test('state is "another-state"', function() {
          wakeLockListenerSpy.yield('cpu', 'another-state');
          assert.isTrue(MockMozPower.cpuSleepAllowed);
        });

        test('state is "locked-background"', function() {
          wakeLockListenerSpy.yield('cpu', 'locked-background');
          assert.isFalse(MockMozPower.cpuSleepAllowed);
        });
      });
    });

    test('Testing SettingsListener.observe for screen.timeout', function() {
      ScreenManager._firstOn = false;
      ScreenManager.turnScreenOn.reset();
      SettingsListener.observe.withArgs('screen.timeout')
          .callsArgWith(2, 50);

      ScreenManager.init();
      assert.isTrue(ScreenManager._firstOn);
      assert.equal(MockMozPower.screenBrightness, 0.5);
      assert.isTrue(ScreenManager.turnScreenOn.called);
    });

    test('Testing SettingsListener.observe for ' +
          'screen.automatic-brightness', function() {
      SettingsListener.observe.reset();
      SettingsListener.observe.withArgs('screen.automatic-brightness')
        .callsArgWith(2, true);
      this.sinon.stub(ScreenManager, 'setDeviceLightEnabled');

      ScreenManager.init();
      assert.isTrue(ScreenManager.setDeviceLightEnabled.called);
    });

    test('Testing callback of telephony.addEventListener', function() {
      navigator.mozTelephony.addEventListener.reset();
      navigator.mozTelephony.addEventListener.withArgs('callschanged');
      ScreenManager.init();
      assert.isTrue(navigator.mozTelephony.addEventListener.called);
    });
  });

  suite('handleEvent()', function() {
    suite('Testing devicelight event', function() {
      var stubAutoAdjust;

      setup(function() {
        stubAutoAdjust = this.sinon.stub(ScreenManager, 'autoAdjustBrightness');
      });

      test('if _deviceLightEnabled is false', function() {
        ScreenManager._deviceLightEnabled = false;
        ScreenManager.handleEvent({'type': 'devicelight'});
        assert.isFalse(stubAutoAdjust.called);
        stubAutoAdjust.reset();
      });

      test('if screenEnabled is false', function() {
        ScreenManager.screenEnabled = false;
        ScreenManager.handleEvent({'type': 'devicelight'});
        assert.isFalse(stubAutoAdjust.called);
        stubAutoAdjust.reset();
      });

      test('if _inTransition is true', function() {
        ScreenManager._inTransition = true;
        ScreenManager.handleEvent({'type': 'devicelight'});
        assert.isFalse(stubAutoAdjust.called);
        stubAutoAdjust.reset();
      });

      test('put all together', function() {
        ScreenManager._deviceLightEnabled = true;
        ScreenManager.screenEnabled = true;
        ScreenManager._inTransition = false;
        ScreenManager.handleEvent({'type': 'devicelight'});
        assert.isTrue(stubAutoAdjust.called);
      });
    });

    test('Testing sleep event', function() {
      var stubTurnOff = this.sinon.stub(ScreenManager, 'turnScreenOff');
      ScreenManager.handleEvent({'type': 'sleep'});
      assert.isTrue(stubTurnOff.calledWith(true, 'powerkey'));
    });

    test('Testing wake event', function() {
      var stubTurnOn = this.sinon.stub(ScreenManager, 'turnScreenOn');
      ScreenManager.handleEvent({'type': 'wake'});
      assert.isTrue(stubTurnOn.called);
    });

    suite('Testing userproximity event', function() {
      var stubTelephony, stubBluetooth, stubStatusBar, stubTurnOn, stubTurnOff;

      setup(function() {
        stubTelephony = {};
        stubBluetooth = { isProfileConnected: function() {} };
        stubStatusBar = {};
        stubTurnOn = this.sinon.stub(ScreenManager, 'turnScreenOn');
        stubTurnOff = this.sinon.stub(ScreenManager, 'turnScreenOff');

        switchProperty(window, 'Bluetooth', stubBluetooth, reals);
        switchProperty(window, 'StatusBar', stubStatusBar, reals);
        switchProperty(navigator, 'mozTelephony', stubTelephony, reals);
      });

      teardown(function() {
        restoreProperty(window, 'Bluetooth', reals);
        restoreProperty(window, 'StatusBar', reals);
        restoreProperty(navigator, 'mozTelephony', reals);
      });

      test('if Bluetooth SCO connected', function() {
        stubBluetooth.Profiles = {};
        this.sinon.stub(stubBluetooth, 'isProfileConnected').returns(true);
        ScreenManager._screenOffBy = 'proximity';
        ScreenManager.handleEvent({'type': 'userproximity'});
        assert.isTrue(stubTurnOn.called);
        assert.isFalse(stubTurnOff.called);
      });

      test('if Bluetooth SCO disconnected', function() {
        stubBluetooth.Profiles = {};
        this.sinon.stub(stubBluetooth, 'isProfileConnected').returns(false);
        stubTelephony.speakerEnabled = false;
        stubStatusBar.headponesActive = false;

        ScreenManager.handleEvent({'type': 'userproximity'});
        assert.isTrue(stubTurnOn.called);
        assert.isFalse(stubTurnOff.called);
      });

      test('if evt.near is yes', function() {
        stubBluetooth.Profiles = {};
        this.sinon.stub(stubBluetooth, 'isProfileConnected').returns(false);
        ScreenManager.handleEvent({'type': 'userproximity', 'near': 'yes'});
        assert.isFalse(stubTurnOn.called);
        assert.isTrue(stubTurnOff.calledWith(true, 'proximity'));
      });

      test('if earphone is connected', function() {
        stubBluetooth.Profiles = {};
        stubStatusBar.headponesActive = true;
        ScreenManager._screenOffBy = 'proximity';
        ScreenManager.handleEvent({'type': 'userproximity'});
        assert.isTrue(stubTurnOn.called);
      });
    });

    suite('Testing callschanged event', function() {
      var stubTelephony, stubCpuWakeLock, stubAttentionScreen,
        stubTurnOn, stubRemoveListener;

      setup(function() {
        stubTelephony = {};
        stubCpuWakeLock = {};
        stubAttentionScreen = {};
        stubTurnOn = this.sinon.stub(ScreenManager, 'turnScreenOn');
        stubRemoveListener = this.sinon.stub(window, 'removeEventListener');

        stubCpuWakeLock.unlock = this.sinon.stub();
        stubAttentionScreen.show = this.sinon.stub();
        ScreenManager._cpuWakeLock = stubCpuWakeLock;

        switchProperty(navigator, 'mozTelephony', stubTelephony, reals);
        switchProperty(window, 'AttentionScreen', stubAttentionScreen, reals);
      });

      teardown(function() {
        restoreProperty(navigator, 'mozTelephony', reals);
        restoreProperty(window, 'AttentionScreen', reals);
      });

      test('screen off by proximity', function() {
        stubTelephony.calls = [];
        stubTelephony.conferenceGroup = {calls: []};
        ScreenManager._screenOffBy = 'proximity';
        ScreenManager.handleEvent({'type': 'callschanged'});

        assert.isTrue(stubTurnOn.called);
        assert.isNull(ScreenManager._cpuWakeLock);
        assert.isTrue(stubCpuWakeLock.unlock.called);
        assert.isFalse(stubAttentionScreen.show.called);
      });

      test('screen off', function() {
        stubTelephony.calls = [];
        stubTelephony.conferenceGroup = {calls: []};
        ScreenManager._screenOffBy = '';
        ScreenManager.handleEvent({'type': 'callschanged'});
        assert.isFalse(stubTurnOn.called);
      });

      test('with a call', function() {
        var stubAddListener = this.sinon.stub();
        stubTelephony.calls = [{'addEventListener': stubAddListener}];
        stubTelephony.conferenceGroup = {calls: []};
        ScreenManager.handleEvent({'type': 'callschanged'});
        assert.isTrue(stubAttentionScreen.show.called);
        assert.isFalse(stubAddListener.called);
      });

      test('with a conference call', function() {
        var stubAddListener = this.sinon.stub();
        stubTelephony.calls = [];
        stubTelephony.conferenceGroup = {
          calls: [{'addEventListener': stubAddListener},
                  {'addEventListener': stubAddListener}]
        };
        ScreenManager.handleEvent({'type': 'callschanged'});
        assert.isTrue(stubAttentionScreen.show.called);
        assert.isFalse(stubAddListener.called);
      });

      test('without cpuWakeLock', function() {
        var stubAddListener = this.sinon.stub();
        stubTelephony.calls = [{'addEventListener': stubAddListener}];
        stubTelephony.conferenceGroup = {calls: []};
        ScreenManager._cpuWakeLock = null;
        ScreenManager.handleEvent({'type': 'callschanged'});
        assert.isFalse(stubAttentionScreen.show.called);
        assert.isTrue(stubAddListener.called);
      });
    });

    suite('Testing statechange event', function() {
      var stubReqWakeLock, stubAddListener, stubCallRemoveListener, evt;

      setup(function() {
        stubReqWakeLock = this.sinon.stub(navigator, 'requestWakeLock');
        stubAddListener = this.sinon.stub(window, 'addEventListener');
        stubCallRemoveListener = this.sinon.stub();

        evt = {
          'type': 'statechange',
          'target': {
            'removeEventListener': stubCallRemoveListener
          }
        };
      });

      test('state is disconnected', function() {
        evt.target.state = 'disconnected';
        ScreenManager.handleEvent(evt);

        assert.isFalse(stubCallRemoveListener.called);
        assert.isFalse(stubAddListener.called);
        assert.isFalse(stubReqWakeLock.called);
      });

      test('state is connected', function() {
        evt.target.state = 'connected';
        ScreenManager.handleEvent(evt);
        assert.isTrue(stubCallRemoveListener.called);
        assert.isTrue(stubAddListener.called);
        assert.isTrue(stubReqWakeLock.called);
      });
    });

    test('Testing shutdown event', function() {
      var powerOffSpy = this.sinon.spy(MockSleepMenu, 'startPowerOff');
      powerOffSpy.withArgs(false);
      this.sinon.stub(ScreenManager, 'turnScreenOn');

      ScreenManager.handleEvent({
        type: 'requestshutdown',
        detail: MockSleepMenu
      });

      assert.isTrue(ScreenManager.turnScreenOn.calledOnce);
      assert.isTrue(powerOffSpy.withArgs(false).calledOnce);
    });
  });

  suite('turnScreenOff()', function() {
    var stubSetIdle,
        stubRemoveListener,
        stubScnClassListAdd,
        stubScreen,
        stubFireEvent,
        stubUnlock,
        stubSetBrightness;

    setup(function() {
      stubSetIdle = this.sinon.stub(ScreenManager, '_setIdleTimeout');
      stubRemoveListener = this.sinon.stub(window, 'removeEventListener');
      stubScnClassListAdd = this.sinon.stub();
      stubScreen = {'classList': {'add': stubScnClassListAdd}};
      stubFireEvent = this.sinon.stub(ScreenManager, 'fireScreenChangeEvent');
      stubUnlock = this.sinon.stub();
      stubSetBrightness = this.sinon.stub(ScreenManager, 'setScreenBrightness');

      switchProperty(ScreenManager, 'screen', stubScreen, reals);
      ScreenManager._cpuWakeLock = {'unlock': stubUnlock};
    });

    teardown(function() {
      restoreProperty(ScreenManager, 'screen', reals);
    });

    test('when screen disabled', function() {
      ScreenManager.screenEnabled = false;
      assert.isFalse(ScreenManager.turnScreenOff());
    });

    test('turn off screen with instant argument', function() {
      ScreenManager.screenEnabled = true;
      assert.isTrue(ScreenManager.turnScreenOff(true, 'powerkey'));
      this.sinon.clock.tick(20);
      assert.equal(stubRemoveListener.callCount, 4);
      assert.isTrue(stubSetIdle.calledWith(0));
      assert.isFalse(ScreenManager.screenEnabled);
      assert.isTrue(stubScnClassListAdd.calledWith('screenoff'));
      assert.isTrue(stubSetBrightness.calledWith(0, true));
      assert.isFalse(MockMozPower.screenEnabled);
      assert.isTrue(ScreenManager.fireScreenChangeEvent.called);
    });

    test('turn off screen wihout instant argument', function() {
      ScreenManager.screenEnabled = true;
      assert.isTrue(ScreenManager.turnScreenOff(false));
      assert.isFalse(stubSetIdle.called);
      this.sinon.clock.tick(ScreenManager._dimNotice);
      assert.isTrue(stubSetIdle.called);
    });

    test('turn off screen but not in transition', function() {
      ScreenManager.screenEnabled = true;
      assert.isTrue(ScreenManager.turnScreenOff(false));
      ScreenManager._inTransition = false;
      this.sinon.clock.tick(ScreenManager._dimNotice);
      assert.isFalse(stubSetIdle.called);
    });
  });


  suite('turnScreenOn()', function() {
    var stubSetBrightness,
        stubReconfTimeout,
        stubTelephony = {},
        stubReqWakeLock,
        stubAddListener,
        stubScnClassListRemove,
        stubScreen,
        stubFireEvent;

    setup(function() {
      stubSetBrightness = this.sinon.stub(ScreenManager, 'setScreenBrightness');
      stubReconfTimeout =
        this.sinon.stub(ScreenManager, '_reconfigScreenTimeout');
      switchProperty(navigator, 'mozTelephony', stubTelephony, reals);
      stubReqWakeLock = this.sinon.stub(navigator, 'requestWakeLock');
      stubAddListener = this.sinon.stub(window, 'addEventListener');
      stubScnClassListRemove = this.sinon.stub();
      stubScreen = {'classList': {'remove': stubScnClassListRemove}};
      switchProperty(ScreenManager, 'screen', stubScreen, reals);
      stubFireEvent = this.sinon.stub(ScreenManager, 'fireScreenChangeEvent');
    });

    teardown(function() {
      restoreProperty(navigator, 'mozTelephony', reals);
      restoreProperty(ScreenManager, 'screen', reals);
    });

    test('screen enabled when _inTransition is false', function() {
      ScreenManager.screenEnabled = true;
      ScreenManager._inTransition = false;
      assert.isFalse(ScreenManager.turnScreenOn(true));
      assert.isFalse(stubReconfTimeout.called);
    });

    test('screen enabled when _inTransition is false', function() {
      ScreenManager._inTransition = true;
      assert.isFalse(ScreenManager.turnScreenOn(true));
      assert.isTrue(stubSetBrightness.called);
      assert.isTrue(stubReconfTimeout.called);
    });

    test('screen disabled when _deviceLightEnable is true', function() {
      ScreenManager.screenEnabled = false;
      stubTelephony.calls = [];
      stubTelephony.conferenceGroup = {calls: []};
      ScreenManager._deviceLightEnable = true;
      ScreenManager.turnScreenOn(true);

      assert.isTrue(stubScnClassListRemove.called);
      assert.isTrue(stubAddListener.called);
      assert.isTrue(stubReconfTimeout.called);
      assert.isTrue(stubFireEvent.called);
    });

    test('screen disabled when _deviceLightEnable is false', function() {
      ScreenManager._deviceLightEnable = false;
      stubAddListener.reset();
      ScreenManager.turnScreenOn(true);

      assert.isFalse(stubAddListener.called);
    });

    test('screen disabled with a call', function() {
      ScreenManager.screenEnabled = false;
      stubTelephony.calls = [{'state': 'connected'}];
      stubTelephony.conferenceGroup = {calls: []};
      ScreenManager.turnScreenOn(true);
      assert.isTrue(stubReqWakeLock.calledWith('cpu'));
      assert.isTrue(stubAddListener.calledWith('userproximity'));
    });

    test('screen disabled with a conference call', function() {
      ScreenManager.screenEnabled = false;
      stubTelephony.calls = [];
      stubTelephony.conferenceGroup = {
        calls: [{'addEventListener': stubAddListener},
                {'addEventListener': stubAddListener}]
      };
      ScreenManager.turnScreenOn(true);
      assert.isTrue(stubReqWakeLock.calledWith('cpu'));
      assert.isTrue(stubAddListener.calledWith('userproximity'));
    });
  });

  suite('setScreenBrightness()', function() {
    var stubClearTimeout, stubTransBrightness;

    setup(function() {
      stubClearTimeout = this.sinon.stub(window, 'clearTimeout');
      stubTransBrightness = this.sinon.stub(ScreenManager,
                                            'transitionBrightness');
    });

    test('set brightness with instant argument', function() {
      ScreenManager.setScreenBrightness(0.5, true);
      assert.isFalse(stubTransBrightness.called);
      assert.equal(MockMozPower.screenBrightness, 0.5);
    });

    test('set brightness without instant argument', function() {
      ScreenManager.setScreenBrightness(0.5, false);
      assert.isTrue(stubTransBrightness.called);
    });
  });

  suite('transitionBrightness()', function() {
    test('same brightness', function() {
      ScreenManager._transitionBrightnessTimer = 'not null';
      ScreenManager._targetBrightness = 0.5;
      MockMozPower.screenBrightness = 0.5;
      ScreenManager.transitionBrightness();
      assert.isNull(ScreenManager._transitionBrightnessTimer);
    });

    test('brightness from 0.9 to 0.4', function() {
      MockMozPower.screenBrightness = 0.9;
      ScreenManager._targetBrightness = 0.4;
      ScreenManager.transitionBrightness();
      assert.equal(MockMozPower.screenBrightness,
          0.9 - ScreenManager.BRIGHTNESS_ADJUST_STEP);
    });

    test('brightness from 0.4 to 0.9', function() {
      MockMozPower.screenBrightness = 0.4;
      ScreenManager._targetBrightness = 0.9;
      ScreenManager.transitionBrightness();
      assert.equal(MockMozPower.screenBrightness,
        0.4 + ScreenManager.BRIGHTNESS_ADJUST_STEP);
    });
  });

  suite('setDeviceLightEnabled()', function() {
    var stubSetBrightness, stubAddListener, stubRemoveListener;

    setup(function() {
      stubSetBrightness = this.sinon.stub(ScreenManager, 'setScreenBrightness');
      stubAddListener = this.sinon.stub(window, 'addEventListener');
      stubRemoveListener = this.sinon.stub(window, 'removeEventListener');
    });

    test('if setDeviceLightEnabled(false) and ' +
        '_deviceLightEnabled is true', function() {
      ScreenManager._userBrightness = 0.5;
      ScreenManager._deviceLightEnabled = true;
      ScreenManager.setDeviceLightEnabled(false);
      assert.isTrue(stubSetBrightness.calledWith(0.5, false));
    });

    test('if argument is true', function() {
      ScreenManager.setDeviceLightEnabled(true);
      assert.isFalse(stubSetBrightness.called);
    });

    test('if argument is false', function() {
      ScreenManager.setDeviceLightEnabled(false);
      assert.isFalse(stubAddListener.called);
      assert.isTrue(stubRemoveListener.called);
    });

    test('if argument & screenEnabled are both true', function() {
      ScreenManager.screenEnabled = true;
      ScreenManager.setDeviceLightEnabled(true);
      assert.isTrue(stubAddListener.called);
      assert.isFalse(stubRemoveListener.called);
    });
  });

  test('_setIdleTimeout()', function() {
    var stubClearIdleTimeout, stubSetIdleTimeout;

    setup(function() {
      stubClearIdleTimeout = this.sinon.stub();
      switchProperty(window, 'clearIdleTimeout', stubClearIdleTimeout, reals);
      stubSetIdleTimeout = this.sinon.stub();
      switchProperty(window, 'setIdleTimeout', stubSetIdleTimeout, reals);
    });

    teardown(function() {
      restoreProperty(window, 'clearIdleTimeout', reals);
      restoreProperty(window, 'setIdleTimeout', reals);
    });

    test('set idle timeout to 100', function() {
      ScreenManager._setIdleTimeout(100, true);
      assert.isTrue(stubClearIdleTimeout.called);
      assert.isTrue(stubSetIdleTimeout.called);
    });

    test('set idle timeout to 0', function() {
    ScreenManager._setIdleTimeout(0, true);
    assert.isTrue(stubClearIdleTimeout.called);
    assert.isFalse(stubSetIdleTimeout.called);
    });
  });

  test('fireScreenChangeEvent()', function() {
    var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');

    ScreenManager.fireScreenChangeEvent();
    assert.isTrue(stubDispatchEvent.called);
  });

  suite('autoAdjustBrightness()', function() {
    var stubSetBrightness;

    setup(function() {
      ScreenManager._targetBrightness = -1;
      stubSetBrightness = this.sinon.stub(ScreenManager, 'setScreenBrightness');
    });

    test('auto adjust brightness to lux 0.1', function() {
      ScreenManager.autoAdjustBrightness(0.1);
      assert.isTrue(stubSetBrightness.calledWith(0.1));
    });

    test('auto adjust brightness to lux 1', function() {
      ScreenManager.autoAdjustBrightness(1);
      assert.isTrue(stubSetBrightness.calledWith(0.1));
    });

    test('auto adjust brightness to lux 10', function() {
      ScreenManager.autoAdjustBrightness(10);
      assert.isTrue(stubSetBrightness.calledWith(0.27));
    });

    test('auto adjust brightness to lux 10000', function() {
      ScreenManager.autoAdjustBrightness(10000);
      assert.isTrue(stubSetBrightness.calledWith(1));
    });

    test('auto adjust brightness to lux 20000', function() {
      ScreenManager.autoAdjustBrightness(20000);
      assert.isTrue(stubSetBrightness.calledWith(1));
    });

    test('auto adjust to same value as current brightness', function() {
      ScreenManager._targetBrightness = 0.1;
      ScreenManager.autoAdjustBrightness(1);
      assert.isFalse(stubSetBrightness.called);
    });
  });

  suite('toggleScreen()', function() {
    var stubTurnOff, stubTurnOn;

    setup(function() {
      stubTurnOff = this.sinon.stub(ScreenManager, 'turnScreenOff');
      stubTurnOn = this.sinon.stub(ScreenManager, 'turnScreenOn');
    });

    test('if screenEnabled is true', function() {
      ScreenManager.screenEnabled = true;
      ScreenManager.toggleScreen();
      assert.isTrue(stubTurnOff.calledWith(true, 'toggle'));
      assert.isFalse(stubTurnOn.called);
    });

    test('if screenEnabled is false', function() {
      ScreenManager.screenEnabled = false;
      ScreenManager.toggleScreen();
      assert.isTrue(stubTurnOn.called);
      assert.isFalse(stubTurnOff.called);
    });
  });
});
