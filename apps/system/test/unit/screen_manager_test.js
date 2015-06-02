/* globals ScreenManager, ScreenBrightnessTransition,
           ScreenWakeLockManager, ScreenAutoBrightness, MockService,
           MockAppWindow, MocksHelper, MockLockScreen, MockMozPower,
           MockSettingsListener, MocksleepMenu */

'use strict';

require('/test/unit/mock_app_window.js');
require('/test/unit/mock_lock_screen.js');
require('/test/unit/mock_statusbar.js');
require('/test/unit/mock_navigator_moz_power.js');
require('/test/unit/mock_sleep_menu.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/shared/test/unit/mocks/mock_service.js');

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

var mocksForScreenManager = new MocksHelper([
  'SettingsListener', 'Service'
]).init();

require('/js/screen_auto_brightness.js');
require('/js/screen_brightness_transition.js');
require('/js/wake_lock_manager.js');

suite('system/ScreenManager', function() {
  var reals = {};
  mocksForScreenManager.attachTestHelpers();

  var stubScreenBrightnessTransition;
  var stubScreenWakeLockManager;
  var stubScreenAutoBrightness;

  setup(function(done) {
    window.lockScreen = MockLockScreen;
    switchProperty(navigator, 'mozPower', MockMozPower, reals, true);
    this.sinon.useFakeTimers();

    stubScreenBrightnessTransition =
      this.sinon.stub(ScreenBrightnessTransition.prototype);
    this.sinon.stub(window, 'ScreenBrightnessTransition')
      .returns(stubScreenBrightnessTransition);

    stubScreenAutoBrightness =
      this.sinon.stub(ScreenAutoBrightness.prototype);
    this.sinon.stub(window, 'ScreenAutoBrightness')
      .returns(stubScreenAutoBrightness);

    stubScreenWakeLockManager =
      this.sinon.stub(ScreenWakeLockManager.prototype);
    this.sinon.stub(window, 'ScreenWakeLockManager')
      .returns(stubScreenWakeLockManager);

    // We make sure fake timers are in place before we require the app
    requireApp('system/js/screen_manager.js', done);
  });

  teardown(function() {
    restoreProperty(navigator, 'mozPower', reals, true);
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
      switchProperty(window, 'lockScreen', stubLockscreen, reals);
    });

    teardown(function() {
      restoreProperty(navigator, 'mozTelephony', reals);
      restoreProperty(window, 'lockScreen', reals);
    });

    test('Event listener adding', function() {
      var eventListenerStub = this.sinon.stub(window, 'addEventListener');
      ScreenManager.init();
      assert.isTrue(eventListenerStub.withArgs('sleep').calledOnce);
      assert.isTrue(eventListenerStub.withArgs('wake').calledOnce);
      assert.isTrue(eventListenerStub.withArgs('requestshutdown').calledOnce);
    });

    test('wake lock handling', function() {
      ScreenManager.init();
      assert.isTrue(stubScreenWakeLockManager.start.calledOnce);

      stubScreenWakeLockManager.onwakelockchange(true);
      assert.isTrue(ScreenManager._reconfigScreenTimeout.called);
    });

    test('Testing SettingsListener.observe for screen.timeout', function() {
      ScreenManager._firstOn = false;
      ScreenManager.turnScreenOn.reset();
      MockSettingsListener.observe.withArgs('screen.timeout')
          .callsArgWith(2, 50);

      ScreenManager.init();
      assert.isTrue(ScreenManager._firstOn);
      assert.equal(MockMozPower.screenBrightness, 0.5);
      assert.isTrue(ScreenManager.turnScreenOn.called);
    });

    test('Testing SettingsListener.observe for ' +
          'screen.automatic-brightness', function() {
      MockSettingsListener.observe.reset();
      MockSettingsListener.observe.withArgs('screen.automatic-brightness')
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

      test('if _deviceLightEnabled is false', function() {
        ScreenManager._deviceLightEnabled = false;
        ScreenManager.handleEvent({'type': 'devicelight'});
        assert.isFalse(stubScreenAutoBrightness.autoAdjust.called);
      });

      test('if screenEnabled is false', function() {
        ScreenManager.screenEnabled = false;
        ScreenManager.handleEvent({'type': 'devicelight'});
        assert.isFalse(stubScreenAutoBrightness.autoAdjust.called);
      });

      test('if _inTransition is true', function() {
        ScreenManager._inTransition = true;
        ScreenManager.handleEvent({'type': 'devicelight'});
        assert.isFalse(stubScreenAutoBrightness.autoAdjust.called);
      });

      test('put all together', function() {
        ScreenManager._deviceLightEnabled = true;
        ScreenManager.screenEnabled = true;
        ScreenManager._inTransition = false;
        ScreenManager.handleEvent({'type': 'devicelight'});
        assert.isTrue(stubScreenAutoBrightness.autoAdjust.called);
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

    test('Testing accessibility action event', function() {
      var stubReconfigScreenTimeout = this.sinon.stub(ScreenManager,
        '_reconfigScreenTimeout');
      ScreenManager.handleEvent({'type': 'accessibility-action'});
      assert.isTrue(stubReconfigScreenTimeout.called);
    });

    suite('Test nfc-tech events', function() {
      test('if _inTransition is true', function() {
        var stubTurnScreenOn = this.sinon.stub(ScreenManager, 'turnScreenOn');
        ScreenManager._inTransition = true;

        ScreenManager.handleEvent({'type': 'nfc-tech-discovered'});
        assert.isTrue(stubTurnScreenOn.calledOnce, 'nfc-tech-discovered');

        ScreenManager.handleEvent({'type': 'nfc-tech-lost'});
        assert.isTrue(stubTurnScreenOn.calledTwice, 'nfc-tech-lost');
      });

      test('if _intransition is false', function() {
        var stubReconfigScreenTimeout = this.sinon.stub(
                                           ScreenManager,
                                           '_reconfigScreenTimeout');

        ScreenManager.handleEvent({'type': 'nfc-tech-discovered'});
        assert.isTrue(stubReconfigScreenTimeout.calledOnce,
                     'nfc-tech-discovered');

        ScreenManager.handleEvent({'type': 'nfc-tech-lost'});
        assert.isTrue(stubReconfigScreenTimeout.calledTwice, 'nfc-tech-lost');
      });
    });

    suite('Testing userproximity event', function() {
      var stubTelephony, stubTurnOn, stubTurnOff;

      setup(function() {
        stubTelephony = {};
        stubTurnOn = this.sinon.stub(ScreenManager, 'turnScreenOn');
        stubTurnOff = this.sinon.stub(ScreenManager, 'turnScreenOff');

        switchProperty(navigator, 'mozTelephony', stubTelephony, reals);
      });

      teardown(function() {
        restoreProperty(navigator, 'mozTelephony', reals);
      });

      test('if Bluetooth SCO connected', function() {
        this.sinon.stub(MockService, 'query').returns(true);
        ScreenManager._screenOffBy = 'proximity';
        ScreenManager.handleEvent({'type': 'userproximity'});
        assert.isTrue(stubTurnOn.called);
        assert.isFalse(stubTurnOff.called);
      });

      test('if Bluetooth SCO disconnected', function() {
        this.sinon.stub(MockService, 'query').returns(false);
        stubTelephony.speakerEnabled = false;
        MockService.mHeadsetConnected = false;

        ScreenManager.handleEvent({'type': 'userproximity'});
        assert.isTrue(stubTurnOn.called);
        assert.isFalse(stubTurnOff.called);
      });

      test('if evt.near is yes', function() {
        this.sinon.stub(MockService, 'query').returns(false);
        ScreenManager.handleEvent({'type': 'userproximity', 'near': 'yes'});
        assert.isFalse(stubTurnOn.called);
        assert.isTrue(stubTurnOff.calledWith(true, 'proximity'));
      });

      test('if earphone is connected', function() {
        MockService.mHeadsetConnected = true;
        ScreenManager._screenOffBy = 'proximity';
        ScreenManager.handleEvent({'type': 'userproximity'});
        assert.isTrue(stubTurnOn.called);
      });
    });

    suite('Testing callschanged event', function() {
      var stubTelephony, stubCpuWakeLock, stubTurnOn, stubRemoveListener;

      setup(function() {
        stubTelephony = {};
        stubCpuWakeLock = {};
        stubTurnOn = this.sinon.stub(ScreenManager, 'turnScreenOn');
        stubRemoveListener = this.sinon.stub(window, 'removeEventListener');

        stubCpuWakeLock.unlock = this.sinon.stub();
        ScreenManager._cpuWakeLock = stubCpuWakeLock;

        switchProperty(navigator, 'mozTelephony', stubTelephony, reals);
      });

      teardown(function() {
        restoreProperty(navigator, 'mozTelephony', reals);
        restoreProperty(window, 'dialerAgent', reals);
      });

      test('screen off by proximity', function() {
        stubTelephony.calls = [];
        stubTelephony.conferenceGroup = {calls: []};
        ScreenManager._screenOffBy = 'proximity';
        ScreenManager.handleEvent({'type': 'callschanged'});
        var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');

        assert.isTrue(stubTurnOn.called);
        assert.isNull(ScreenManager._cpuWakeLock);
        assert.isTrue(stubCpuWakeLock.unlock.called);
        assert.isFalse(stubDispatchEvent.calledWith('open-callscreen'));
      });

      test('screen off', function() {
        stubTelephony.calls = [];
        stubTelephony.conferenceGroup = {calls: []};
        ScreenManager._screenOffBy = '';
        ScreenManager.handleEvent({'type': 'callschanged'});
        assert.isTrue(stubTurnOn.called);
      });

      test('with a call', function() {
        var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');
        var stubAddListener = this.sinon.stub();
        stubTelephony.calls = [{'addEventListener': stubAddListener}];
        stubTelephony.conferenceGroup = {calls: []};
        ScreenManager.handleEvent({'type': 'callschanged'});
        assert.isFalse(stubDispatchEvent.calledWith('open-callscreen'));
        assert.isFalse(stubAddListener.called);
      });

      test('with a conference call', function() {
        var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');
        var stubAddListener = this.sinon.stub();
        stubTelephony.calls = [];
        stubTelephony.conferenceGroup = {
          calls: [{'addEventListener': stubAddListener},
                  {'addEventListener': stubAddListener}]
        };
        ScreenManager.handleEvent({'type': 'callschanged'});
        assert.isFalse(stubDispatchEvent.calledWith('open-callscreen'));
        assert.isFalse(stubAddListener.called);
      });

      test('without cpuWakeLock', function() {
        var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');
        var stubAddListener = this.sinon.stub();
        stubTelephony.calls = [{'addEventListener': stubAddListener}];
        stubTelephony.conferenceGroup = {calls: []};
        ScreenManager._cpuWakeLock = null;
        ScreenManager.handleEvent({'type': 'callschanged'});
        assert.isFalse(stubDispatchEvent.calledWith('open-callscreen'));
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
      var powerOffSpy = this.sinon.spy(MocksleepMenu, 'startPowerOff');
      powerOffSpy.withArgs(false);
      this.sinon.stub(ScreenManager, 'turnScreenOn');

      ScreenManager.handleEvent({
        type: 'requestshutdown',
        detail: MocksleepMenu
      });

      assert.isTrue(ScreenManager.turnScreenOn.calledOnce);
      assert.isTrue(powerOffSpy.withArgs(false).calledOnce);
    });

    suite('Testing logohidden event', function() {
      var fakeAppConfig1 = {
        url: 'app://www.fake/index.html',
        manifest: {},
        manifestURL: 'app://wwww.fake/ManifestURL',
        origin: 'app://www.fake'
      };

      setup(function() {
        var stubSecureWindowManager = {
          isActive: function() {
            return false;
          }
        };
        switchProperty(window, 'secureWindowManager',
          stubSecureWindowManager, reals);
        this.sinon.spy(ScreenManager, '_setIdleTimeout');
        this.sinon.stub(window, 'removeEventListener');
      });

      teardown(function() {
        restoreProperty(window, 'secureWindowManager', reals);
      });

      test('Lockscreen is displayed', function() {
        MockService.locked = true;
        window.dispatchEvent(new CustomEvent('logohidden'));
        assert.ok(ScreenManager._setIdleTimeout
          .withArgs(ScreenManager.LOCKING_TIMEOUT, true).calledOnce);
      });

      test('An app is displayed', function() {
        MockService.currentApp = new MockAppWindow(fakeAppConfig1);
        window.dispatchEvent(new CustomEvent('logohidden'));
        assert.ok(ScreenManager._setIdleTimeout
          .withArgs(ScreenManager._idleTimeout, false).calledOnce);
      });

      test('Remove the event listener', function() {
        window.dispatchEvent(new CustomEvent('logohidden'));
        assert.ok(window.removeEventListener
          .withArgs('logohidden', ScreenManager).calledOnce);
      });
    });
  });

  suite('turnScreenOff()', function() {
    var stubSetIdle,
        stubRemoveListener,
        stubScnClassListAdd,
        stubScnClassListRemove,
        stubScreen,
        stubFireEvent,
        stubUnlock,
        stubSetBrightness;

    setup(function() {
      stubSetIdle = this.sinon.stub(ScreenManager, '_setIdleTimeout');
      stubRemoveListener = this.sinon.stub(window, 'removeEventListener');
      stubScnClassListAdd = this.sinon.stub();
      stubScnClassListRemove = this.sinon.stub();
      stubScreen = {'classList': {'add': stubScnClassListAdd,
                    'remove': stubScnClassListRemove}};
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

    test('turn off instantly then on again', function() {
      ScreenManager.screenEnabled = true;
      assert.isTrue(ScreenManager.turnScreenOff(true, 'powerkey'));
      this.sinon.clock.tick(10);
      assert.isTrue(ScreenManager.turnScreenOn(true));
      this.sinon.clock.tick(10);
      assert.isTrue(ScreenManager.screenEnabled);
      assert.isTrue(MockMozPower.screenEnabled);
      assert.isTrue(stubScnClassListAdd.calledWith('screenoff'));
      assert.isTrue(stubScnClassListRemove.calledWith('screenoff'));
      sinon.assert.callOrder(stubScnClassListAdd, stubScnClassListRemove);
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
    test('set brightness with instant argument', function() {
      ScreenManager.setScreenBrightness(0.5, true);
      assert.equal(MockMozPower.screenBrightness, 0.5);
    });

    test('set brightness without instant argument', function() {
      ScreenManager.setScreenBrightness(0.5, false);
      assert.isTrue(stubScreenBrightnessTransition.transitionTo.called);
    });
  });

  suite('setDeviceLightEnabled()', function() {
    var stubSetBrightness, stubRemoveListener;

    setup(function() {
      stubSetBrightness = this.sinon.stub(ScreenManager, 'setScreenBrightness');
      this.sinon.stub(window, 'addEventListener');
      stubRemoveListener = this.sinon.stub(window, 'removeEventListener');
      ScreenManager._previousLux = 20;
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
      assert.isNull(ScreenManager._previousLux);
    });

    test('if argument is false', function() {
      ScreenManager.setDeviceLightEnabled(false);
      sinon.assert.notCalled(window.addEventListener);
      assert.isTrue(stubRemoveListener.called);
      assert.isNull(ScreenManager._previousLux);
    });

    test('if argument & screenEnabled are both true', function() {
      ScreenManager.screenEnabled = true;
      ScreenManager.setDeviceLightEnabled(true);
      sinon.assert.calledWith(window.addEventListener, 'devicelight');
      assert.isFalse(stubRemoveListener.called);
      assert.isNull(ScreenManager._previousLux);
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

  suite('Attention window open events', function() {
    test('handle attentionopening event', function() {
      // The public interface is event, so we manually fire and forward it to
      // the handler, to avoid the asynchronous part which is unnecessary in
      // the test.
      var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent',
        function(e) {
          ScreenManager.handleEvent(e);
        });
      var stubTurnOn = this.sinon.stub(ScreenManager, 'turnScreenOn');
      ScreenManager.enabled = false;
      window.dispatchEvent(new CustomEvent('attentionopening'));
      assert.isTrue(stubTurnOn.called);
      stubDispatchEvent.restore();
    });

    test('handle attentionopened event', function() {
      // The public interface is event, so we manually fire and forward it to
      // the handler, to avoid the asynchronous part which is unnecessary in
      // the test.
      var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent',
        function(e) {
          ScreenManager.handleEvent(e);
        });
      var stubTurnOn = this.sinon.stub(ScreenManager, 'turnScreenOn');
      ScreenManager.enabled = false;
      window.dispatchEvent(new CustomEvent('attentionopened'));
      assert.isTrue(stubTurnOn.called);
      stubDispatchEvent.restore();
    });
  });

  suite('secureapp opened/terminated events', function() {
    test('secur-appeopend', function() {
      var evt = { 'type': 'secure-appopened' };
      var stubReconfigScreenTimeout =
        this.sinon.stub(ScreenManager, '_reconfigScreenTimeout');
      ScreenManager.handleEvent(evt);
      assert.isTrue(stubReconfigScreenTimeout.called,
        'it doesn\'t reset the timeout while secure appcreated');
    });

    test('secur-appterminated', function() {
      var evt = { 'type': 'secure-appterminated' };
      var stubReconfigScreenTimeout =
        this.sinon.stub(ScreenManager, '_reconfigScreenTimeout');
      ScreenManager.handleEvent(evt);
      assert.isTrue(stubReconfigScreenTimeout.called,
        'it doesn\'t reset the timeout while secure appterminated');
    });
  });

  suite('unlocking-start/stop events', function() {
    test('handle unlocking-start event', function() {
      // The public interface is event, so we manually fire and forward it to
      // the handler, to avoid the asynchronous part which is unnecessary in
      // the test.
      var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent',
        function(e) {
          ScreenManager.handleEvent(e);
        });
      window.dispatchEvent(new CustomEvent('unlocking-start'));
      assert.isTrue(ScreenManager._unlocking);
      stubDispatchEvent.restore();
    });

    test('handle unlocking-stop event', function() {
      var stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent',
        function(e) {
          ScreenManager.handleEvent(e);
        });
      var stubReconfigScreenTimeout = this.sinon.stub(ScreenManager,
        '_reconfigScreenTimeout');
      window.dispatchEvent(new CustomEvent('unlocking-stop'));
      assert.isFalse(ScreenManager._unlocking);
      assert.isTrue(stubReconfigScreenTimeout.called);
      stubDispatchEvent.restore();
      stubReconfigScreenTimeout.restore();
    });
  });
});
