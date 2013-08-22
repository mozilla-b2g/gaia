'use strict';

mocha.globals(['SettingsListener', 'LockScreen', 'Bluetooth', 'StatusBar',
      'AttentionScreen', 'removeEventListener', 'addEventListener',
      'clearIdleTimeout', 'setIdleTimeout', 'dispatchEvent']);

requireApp('system/js/screen_manager.js');

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

  suite('init()', function() {
    setup(function() {
      var stubPower = {};
      var stubSettingListener = {};
      var stubTelephony = {};
      var stubLockscreen = {};
      var stubById = sinon.stub(document, 'getElementById').withArgs('screen')
          .returns(document.createElement('div'));

      stubPower.addWakeLockListener = sinon.stub().callsArgWith(0, 'screen',
          'locked-foreground');
      stubSettingListener.observe = sinon.stub();
      stubTelephony.addEventListener = sinon.stub();
      stubLockscreen.locked = true;

      sinon.stub(ScreenManager, 'turnScreenOn');
      sinon.stub(ScreenManager, '_reconfigScreenTimeout');
      sinon.stub(ScreenManager, '_setIdleTimeout');

      switchProperty(navigator, 'mozPower', stubPower, reals, true);
      switchProperty(navigator, 'mozTelephony', stubTelephony, reals);
      switchProperty(window, 'SettingsListener', stubSettingListener, reals);
      switchProperty(window, 'LockScreen', stubLockscreen, reals);
    });

    teardown(function() {
      document.getElementById.restore();
      restoreProperty(navigator, 'mozPower', reals, true);
      restoreProperty(navigator, 'mozTelephony', reals);
      restoreProperty(window, 'SettingsListener', reals);
      restoreProperty(window, 'LockScreen', reals);

      ScreenManager.turnScreenOn.restore();
      ScreenManager._reconfigScreenTimeout.restore();
      ScreenManager._setIdleTimeout.restore();
    });

    test('Testing callback of power.addWakeLockListener', function() {
      ScreenManager.init();
      assert.isTrue(ScreenManager._screenWakeLocked);
      assert.isTrue(ScreenManager.turnScreenOn.called);
      assert.isTrue(ScreenManager._reconfigScreenTimeout.called);
    });

    test('Testing callback of power.addWakeLockListener' +
        ' with topic "screen"', function() {
      navigator.mozPower.addWakeLockListener = sinon.stub()
          .callsArgWith(0, 'screen', 'locked-background');
      ScreenManager.turnScreenOn.reset();
      ScreenManager.init();
      assert.isFalse(ScreenManager._screenWakeLocked);
      assert.isFalse(ScreenManager.turnScreenOn.called);
      assert.isTrue(ScreenManager._reconfigScreenTimeout.called);
    });

    test('Testing callback of power.addWakeLockListener' +
        ' with topic "cpu"', function() {
      navigator.mozPower.addWakeLockListener = sinon.stub()
          .callsArgWith(0, 'cpu', 'another-state');
      ScreenManager.init();
      assert.isTrue(navigator.mozPower.cpuSleepAllowed);

      navigator.mozPower.addWakeLockListener = sinon.stub()
          .callsArgWith(0, 'cpu', 'locked-background');
      ScreenManager.init();
      assert.isFalse(navigator.mozPower.cpuSleepAllowed);
    });

    test('Testing SettingsListener.observe for screen.timeout', function() {
      ScreenManager._firstOn = false;
      ScreenManager.turnScreenOn.reset();
      SettingsListener.observe.withArgs('screen.timeout')
          .callsArgWith(2, 50);

      ScreenManager.init();
      assert.isTrue(ScreenManager._firstOn);
      assert.equal(navigator.mozPower.screenBrightness, 0.5);
      assert.isTrue(ScreenManager.turnScreenOn.called);
    });

    test('Testing SettingsListener.observe for ' +
          'screen.automatic-brightness', function() {
      SettingsListener.observe.reset();
      SettingsListener.observe.withArgs('screen.automatic-brightness')
        .callsArgWith(2, true);
      sinon.stub(ScreenManager, 'setDeviceLightEnabled');

      ScreenManager.init();
      assert.isTrue(ScreenManager.setDeviceLightEnabled.called);
      ScreenManager.setDeviceLightEnabled.restore();
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
        stubAutoAdjust = sinon.stub(ScreenManager, 'autoAdjustBrightness');
      });

      teardown(function() {
        stubAutoAdjust.restore();
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
      var stubTurnOff = sinon.stub(ScreenManager, 'turnScreenOff');
      ScreenManager.handleEvent({'type': 'sleep'});
      assert.isTrue(stubTurnOff.calledWith(true, 'powerkey'));
      stubTurnOff.restore();
    });

    test('Testing wake event', function() {
      var stubTurnOn = sinon.stub(ScreenManager, 'turnScreenOn');
      ScreenManager.handleEvent({'type': 'wake'});
      assert.isTrue(stubTurnOn.called);
      stubTurnOn.restore();
    });

    suite('Testing userproximity event', function() {
      var stubTelephony, stubBluetooth, stubStatusBar, stubTurnOn, stubTurnOff;

      setup(function() {
        stubTelephony = {};
        stubBluetooth = {};
        stubStatusBar = {};
        stubTurnOn = sinon.stub(ScreenManager, 'turnScreenOn');
        stubTurnOff = sinon.stub(ScreenManager, 'turnScreenOff');

        switchProperty(window, 'Bluetooth', stubBluetooth, reals);
        switchProperty(window, 'StatusBar', stubStatusBar, reals);
        switchProperty(navigator, 'mozTelephony', stubTelephony, reals);
      });

      teardown(function() {
        stubTurnOn.restore();
        stubTurnOff.restore();
        restoreProperty(window, 'Bluetooth', reals);
        restoreProperty(window, 'StatusBar', reals);
        restoreProperty(navigator, 'mozTelephony', reals);
      });

      test('if Bluetooth SCO connected', function() {
        stubBluetooth.Profiles = {};
        stubBluetooth.isProfileConnected = sinon.stub().returns(true);
        ScreenManager.handleEvent({'type': 'userproximity'});
        assert.isFalse(stubTurnOn.called);
        assert.isFalse(stubTurnOff.called);
      });

      test('if Bluetooth SCO disconnected', function() {
        stubBluetooth.Profiles = {};
        stubBluetooth.isProfileConnected = sinon.stub().returns(false);
        stubTelephony.speakerEnabled = false;
        stubStatusBar.headponesActive = false;

        ScreenManager.handleEvent({'type': 'userproximity'});
        assert.isTrue(stubTurnOn.called);
        assert.isFalse(stubTurnOff.called);
      });

      test('if evt.near is yes', function() {
        stubBluetooth.Profiles = {};
        stubBluetooth.isProfileConnected = sinon.stub().returns(false);
        ScreenManager.handleEvent({'type': 'userproximity', 'near': 'yes'});
        assert.isFalse(stubTurnOn.called);
        assert.isTrue(stubTurnOff.calledWith(true, 'proximity'));
      });
    });

    suite('Testing callschanged event', function() {
      var stubTelephony, stubCpuWakeLock, stubAttentionScreen,
        stubTurnOn, stubRemoveListener;

      setup(function() {
        stubTelephony = {};
        stubCpuWakeLock = {};
        stubAttentionScreen = {};
        stubTurnOn = sinon.stub(ScreenManager, 'turnScreenOn');
        stubRemoveListener = sinon.stub();

        stubCpuWakeLock.unlock = sinon.stub();
        stubAttentionScreen.show = sinon.stub();
        ScreenManager._cpuWakeLock = stubCpuWakeLock;

        switchProperty(navigator, 'mozTelephony', stubTelephony, reals);
        switchProperty(window, 'AttentionScreen', stubAttentionScreen, reals);
        switchProperty(window, 'removeEventListener',
            stubRemoveListener, reals);
      });

      teardown(function() {
        stubTurnOn.restore();
        restoreProperty(navigator, 'mozTelephony', reals);
        restoreProperty(window, 'AttentionScreen', reals);
        restoreProperty(window, 'removeEventListener', reals);
      });

      test('screen off by proximity', function() {
        stubTelephony.calls = [];
        ScreenManager._screenOffBy = 'proximity';
        ScreenManager.handleEvent({'type': 'callschanged'});

        assert.isTrue(stubTurnOn.called);
        assert.isNull(ScreenManager._cpuWakeLock);
        assert.isTrue(stubCpuWakeLock.unlock.called);
        assert.isFalse(stubAttentionScreen.show.called);
      });

      test('screen off', function() {
        stubTelephony.calls = [];
        ScreenManager._screenOffBy = '';
        ScreenManager.handleEvent({'type': 'callschanged'});
        assert.isFalse(stubTurnOn.called);
      });

      test('with a call', function() {
        var stubAddListener = sinon.stub();
        stubTelephony.calls = [{'addEventListener': stubAddListener}];
        ScreenManager.handleEvent({'type': 'callschanged'});
        assert.isTrue(stubAttentionScreen.show.called);
        assert.isFalse(stubAddListener.called);
      });

      test('without cpuWakeLock', function() {
        var stubAddListener = sinon.stub();
        stubTelephony.calls = [{'addEventListener': stubAddListener}];
        ScreenManager._cpuWakeLock = null;
        ScreenManager.handleEvent({'type': 'callschanged'});
        assert.isFalse(stubAttentionScreen.show.called);
        assert.isTrue(stubAddListener.called);
      });
    });

    suite('Testing statechange event', function() {
      var stubReqWakeLock, stubAddListener, stubCallRemoveListener, evt;

      setup(function() {
        stubReqWakeLock = sinon.stub(navigator, 'requestWakeLock');
        stubAddListener = sinon.stub();
        stubCallRemoveListener = sinon.stub();
        switchProperty(window, 'addEventListener', stubAddListener, reals);

        evt = {
          'type': 'statechange',
          'target': {
            'removeEventListener': stubCallRemoveListener
          }
        };
      });

      teardown(function() {
        stubReqWakeLock.restore();
        restoreProperty(window, 'addEventListener', reals);
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
  });

  suite('turnScreenOff()', function() {
    var stubSetIdle,
        stubRemoveListener,
        stubScnClassListAdd,
        stubScreen,
        fakeTimers,
        stubPower,
        stubFireEvent,
        stubUnlock,
        stubSetBrightness;

    setup(function() {
      stubSetIdle = sinon.stub(ScreenManager, '_setIdleTimeout');
      stubRemoveListener = sinon.stub();
      stubScnClassListAdd = sinon.stub();
      stubScreen = {'classList': {'add': stubScnClassListAdd}};
      fakeTimers = sinon.useFakeTimers();
      stubPower = {};
      stubFireEvent = sinon.stub(ScreenManager, 'fireScreenChangeEvent');
      stubUnlock = sinon.stub();
      stubSetBrightness = sinon.stub(ScreenManager, 'setScreenBrightness');

      switchProperty(window, 'removeEventListener', stubRemoveListener, reals);
      switchProperty(navigator, 'mozPower', stubPower, reals, true);
      switchProperty(ScreenManager, 'screen', stubScreen, reals);
      ScreenManager._cpuWakeLock = {'unlock': stubUnlock};
    });

    teardown(function() {
      stubSetIdle.restore();
      restoreProperty(window, 'removeEventListener', reals);
      restoreProperty(ScreenManager, 'screen', reals);
      restoreProperty(navigator, 'mozPower', reals, true);
      fakeTimers.restore();
      stubFireEvent.restore();
      stubSetBrightness.restore();
    });

    test('when screen disabled', function() {
      ScreenManager.screenEnabled = false;
      assert.isFalse(ScreenManager.turnScreenOff());
    });

    test('turn off screen with instant argument', function() {
      ScreenManager.screenEnabled = true;
      assert.isTrue(ScreenManager.turnScreenOff(true, 'powerkey'));
      fakeTimers.tick(20);
      assert.isTrue(stubRemoveListener.calledTwice);
      assert.isTrue(stubSetIdle.calledWith(0));
      assert.isFalse(ScreenManager.screenEnabled);
      assert.isTrue(stubScnClassListAdd.calledWith('screenoff'));
      assert.isTrue(stubSetBrightness.calledWith(0, true));
      assert.isFalse(stubPower.screenEnabled);
      assert.isTrue(ScreenManager.fireScreenChangeEvent.called);
    });

    test('turn off screen wihout instant argument', function() {
      ScreenManager.screenEnabled = true;
      assert.isTrue(ScreenManager.turnScreenOff(false));
      assert.isFalse(stubSetIdle.called);
      fakeTimers.tick(ScreenManager._dimNotice);
      assert.isTrue(stubSetIdle.called);
    });

    test('turn off screen but not in transition', function() {
      ScreenManager.screenEnabled = true;
      assert.isTrue(ScreenManager.turnScreenOff(false));
      ScreenManager._inTransition = false;
      fakeTimers.tick(ScreenManager._dimNotice);
      assert.isFalse(stubSetIdle.called);
    });
  });


  suite('turnScreenOn()', function() {
    var stubSetBrightness,
        stubReconfTimeout,
        stubTelephony = {},
        stubReqWakeLock,
        stubAddListener,
        stubPower,
        stubScnClassListRemove,
        stubScreen,
        stubFireEvent;

    setup(function() {
      stubSetBrightness = sinon.stub(ScreenManager, 'setScreenBrightness');
      stubReconfTimeout = sinon.stub(ScreenManager, '_reconfigScreenTimeout');
      switchProperty(navigator, 'mozTelephony', stubTelephony, reals);
      stubReqWakeLock = sinon.stub(navigator, 'requestWakeLock');
      stubAddListener = sinon.stub();
      switchProperty(window, 'addEventListener', stubAddListener, reals);
      stubPower = {};
      switchProperty(navigator, 'mozPower', stubPower, reals, true);
      stubScnClassListRemove = sinon.stub();
      stubScreen = {'classList': {'remove': stubScnClassListRemove}};
      switchProperty(ScreenManager, 'screen', stubScreen, reals);
      stubFireEvent = sinon.stub(ScreenManager, 'fireScreenChangeEvent');
    });

    teardown(function() {
      stubSetBrightness.restore();
      stubReconfTimeout.restore();
      restoreProperty(navigator, 'mozTelephony', reals);
      stubReqWakeLock.restore();
      restoreProperty(window, 'addEventListener', reals);
      restoreProperty(navigator, 'mozPower', reals, true);
      restoreProperty(ScreenManager, 'screen', reals);
      stubFireEvent.restore();
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
      ScreenManager.turnScreenOn(true);
      assert.isTrue(stubReqWakeLock.calledWith('cpu'));
      assert.isTrue(stubAddListener.calledWith('userproximity'));
    });
  });

  suite('setScreenBrightness()', function() {
    var stubClearTimeout, stubTransBrightness, stubPower;

    setup(function() {
      stubClearTimeout = sinon.stub();
      stubTransBrightness = sinon.stub(ScreenManager, 'transitionBrightness');
      stubPower = {};
      switchProperty(navigator, 'mozPower', stubPower, reals, true);
      switchProperty(window, 'clearTimeout', stubClearTimeout, reals);
    });

    teardown(function() {
      restoreProperty(window, 'clearTimeout', reals);
      restoreProperty(navigator, 'mozPower', reals, true);
      stubTransBrightness.restore();
    });

    test('set brightness with instant argument', function() {
      ScreenManager.setScreenBrightness(0.5, true);
      assert.isFalse(stubTransBrightness.called);
      assert.equal(stubPower.screenBrightness, 0.5);
    });

    test('set brightness without instant argument', function() {
      ScreenManager.setScreenBrightness(0.5, false);
      assert.isTrue(stubTransBrightness.called);
    });
  });

  suite('transitionBrightness()', function() {
    var stubPower, fakeTimers;

    setup(function() {
      stubPower = {};
      switchProperty(navigator, 'mozPower', stubPower, reals, true);
      fakeTimers = sinon.useFakeTimers();
    });

    teardown(function() {
      restoreProperty(navigator, 'mozPower', reals, true);
      fakeTimers.restore();
    });

    test('same brightness', function() {
      ScreenManager._transitionBrightnessTimer = 'not null';
      ScreenManager._targetBrightness = 0.5;
      stubPower.screenBrightness = 0.5;
      ScreenManager.transitionBrightness();
      assert.isNull(ScreenManager._transitionBrightnessTimer);
    });

    test('brightness from 0.9 to 0.4', function() {
      stubPower.screenBrightness = 0.9;
      ScreenManager._targetBrightness = 0.4;
      ScreenManager.transitionBrightness();
      assert.equal(stubPower.screenBrightness,
          0.9 - ScreenManager.BRIGHTNESS_ADJUST_STEP);
    });

    test('brightness from 0.4 to 0.9', function() {
      stubPower.screenBrightness = 0.4;
      ScreenManager._targetBrightness = 0.9;
      ScreenManager.transitionBrightness();
      assert.equal(stubPower.screenBrightness,
        0.4 + ScreenManager.BRIGHTNESS_ADJUST_STEP);
    });
  });

  suite('setDeviceLightEnabled()', function() {
    var stubSetBrightness, stubAddListener, stubRemoveListener;

    setup(function() {
      stubSetBrightness = sinon.stub(ScreenManager, 'setScreenBrightness');
      stubAddListener = sinon.stub();
      switchProperty(window, 'addEventListener', stubAddListener, reals);
      stubRemoveListener = sinon.stub();
      switchProperty(window, 'removeEventListener', stubRemoveListener, reals);
    });

    teardown(function() {
      stubSetBrightness.restore();
      restoreProperty(window, 'addEventListener', reals);
      restoreProperty(window, 'removeEventListener', reals);
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
      stubClearIdleTimeout = sinon.stub();
      switchProperty(window, 'clearIdleTimeout', stubClearIdleTimeout, reals);
      stubSetIdleTimeout = sinon.stub();
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
    var stubDispatchEvent = sinon.stub();
    switchProperty(window, 'dispatchEvent', stubDispatchEvent, reals);

    ScreenManager.fireScreenChangeEvent();
    assert.isTrue(stubDispatchEvent.called);

    restoreProperty(window, 'dispatchEvent', reals);
  });

  suite('autoAdjustBrightness()', function() {
    var stubSetBrightness;

    setup(function() {
      ScreenManager._targetBrightness = -1;
      stubSetBrightness = sinon.stub(ScreenManager, 'setScreenBrightness');
    });

    teardown(function() {
      stubSetBrightness.restore();
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
      stubTurnOff = sinon.stub(ScreenManager, 'turnScreenOff');
      stubTurnOn = sinon.stub(ScreenManager, 'turnScreenOn');
    });

    teardown(function() {
      stubTurnOff.restore();
      stubTurnOn.restore();
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
