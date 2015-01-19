/* global WifiWakeLockManager */

'use strict';

require('/test/unit/mock_wifi_manager.js');
require('/test/unit/mock_navigator_moz_power.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');

require('/js/wake_lock_manager.js');

var MockScreenManager = {
  screenEnabled: true
};

var MockMozSetMessageHandler_listeners = {};
function MockMozSetMessageHandler(event, listener) {
  MockMozSetMessageHandler_listeners[event] = listener;
}

var MockMozAlarms = {
  _time: null,
  _timezone: null,
  _func: null,
  _id: null,
  _mCallbacks: {},

  add: function add(time, timezone, func) {
    this._timezone = timezone;
    this._func = func;
    return this._mCallbacks;
  },
  remove: function remove(id) {
    this._id = id;
  }
};

var MockDevice = {
  name: null,
  isLocked: false,
  unlock: function unlock() {
    this.isLocked = false;
  },
  lock: function lock() {
    this.isLocked = true;
  }
};

function MockRequestWakeLock(device) {
  MockDevice.name = device;
  return MockDevice;
}

var MockEventListener = {};
function MockAddEventListener(event, listener) {
  MockEventListener[event] = listener;
}

suite('WiFi > ', function() {
  var stubMozSettings;
  var stubWifiManager;
  var stubRequestWakeLock;
  var stubAddEventListener;
  var stubWifiWakeLockManager;

  var fakeClock;

  var realSettingsListener;
  var realScreenManager;
  var realMozSetMessageHandler;
  var realBattery;
  var realMozPower;
  var realMozSettings;
  var realWifiManager;

  var firstRequire = true;

  setup(function(done) {
    stubRequestWakeLock = this.sinon.stub(navigator,
      'requestWakeLock', MockRequestWakeLock);

    stubWifiWakeLockManager =
      this.sinon.stub(WifiWakeLockManager.prototype);
    this.sinon.stub(window, 'WifiWakeLockManager')
      .returns(stubWifiWakeLockManager);

    fakeClock = this.sinon.useFakeTimers();

    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
    realScreenManager = window.ScreenManager;
    window.ScreenManager = MockScreenManager;
    realSettingsListener = window.SettingsListener;
    window.SettingsListener = MockSettingsListener;
    realMozSetMessageHandler = navigator.mozSetMessageHandler;
    navigator.mozSetMessageHandler = MockMozSetMessageHandler;
    realWifiManager = navigator.mozWifiManager;
    navigator.mozWifiManager = MockWifiManager;

    realBattery = navigator.battery;
    Object.defineProperty(navigator, 'battery', {
      writable: true
    });
    navigator.battery = realBattery;

    realMozPower = navigator.mozPower;
    Object.defineProperty(navigator, 'mozPower', {
      writable: true
    });
    navigator.mozPower = MockMozPower;

    // Ensure |navigator| has property |mozAlarm| to create sinon stubs.
    if (!navigator.hasOwnProperty('mozAlarms')) {
      Object.defineProperty(navigator, 'mozAlarms', {
        writable: true
      });
    }

    require('/js/wifi.js', function() {
      // Wifi.init() at the end of the wifi.js only executed once when
      // require() includes the script for real.
      if (firstRequire) {
        Wifi.init();
      } else {
        firstRequire = false;
      }

      done();
    });
  });

  teardown(function() {
    stubRequestWakeLock.restore();
    fakeClock.restore();

    navigator.mozSettings = realMozSettings;
    window.SettingsListener = realSettingsListener;
    window.ScreenManager = realScreenManager;
    navigator.mozSetMessageHandler = realMozSetMessageHandler;
    navigator.mozPower = realMozPower;
    navigator.mozWifiManager = realWifiManager;
  });

  suite('Init', function() {
    test('Test Wifi.handleEvent is bind', function() {
      var isMaybeToggleWifiCalled = false;
      var stubWifiMaybeToggleWifi =
        this.sinon.stub(Wifi, 'maybeToggleWifi', function(evt) {
          isMaybeToggleWifiCalled = true;
        });

      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent('screenchange',
        /* canBubble */ true, /* cancelable */ false, null);
      window.dispatchEvent(evt);
      assert.equal(isMaybeToggleWifiCalled, true);

      isMaybeToggleWifiCalled = false;

      evt = document.createEvent('CustomEvent');
      evt.initCustomEvent('chargingchange',
        /* canBubble */ true, /* cancelable */ false, null);
      window.navigator.battery.dispatchEvent(evt);
      assert.equal(isMaybeToggleWifiCalled, true);

      stubWifiMaybeToggleWifi.restore();
    });

    test('Test wifiManager event is dispatched', function() {
      var localEvent;
      var stubDispatchEvent =
        this.sinon.stub(window, 'dispatchEvent', function(evt) {
          localEvent = evt;
        });

      navigator.mozWifiManager.onenabled();
      assert.equal(localEvent.type, 'wifi-enabled');
      navigator.mozWifiManager.ondisabled();
      assert.equal(localEvent.type, 'wifi-disabled');
      navigator.mozWifiManager.onstatuschange();
      assert.equal(localEvent.type, 'wifi-statuschange');

      stubDispatchEvent.restore();
    });

    test('Test SettingsListener callback wifi.screen_off_timeout', function() {
      SettingsListener.mCallbacks['wifi.screen_off_timeout'](2000);
      assert.equal(Wifi.screenOffTimeout, 2000);
    });

    test('Test SettingsListener callback wifi.enabled is set to true',
      function() {
        Wifi.wifiEnabled = false;
        SettingsListener.mCallbacks['wifi.enabled'](true);
        assert.equal(Wifi.wifiEnabled, true);
    });

    test('Test SettingsListener callback wifi.enabled is set to false',
      function() {
        Wifi.wifiEnabled = true;
        SettingsListener.mCallbacks['wifi.enabled'](false);
        assert.equal(Wifi.wifiEnabled, false);
    });

    test('Test WifiWakeLockManager is started', function() {
      assert.isTrue(stubWifiWakeLockManager.start.calledOnce);
    });
  });

  suite('maybeToggleWifi', function() {
    test('Test turn wifi back on', function() {
      SettingsListener.mCallbacks['wifi.screen_off_timeout'](100);
      Wifi.wifiDisabledByWakelock = true;

      MockLock.clear();

      Wifi.maybeToggleWifi();

      assert.equal(Wifi.wifiDisabledByWakelock, false);
      assert.equal(MockLock.locks[0]['wifi.enabled'], true);
      assert.equal(MockLock.locks[1]['wifi.disabled_by_wakelock'], false);
    });

    test('Test remove should be called when _alarmId exists', function() {
      SettingsListener.mCallbacks['wifi.screen_off_timeout'](100);
      Wifi.wifiDisabledByWakelock = true;
      Wifi._alarmId = 'test-id';

      var stubMozAlarms = this.sinon.stub(navigator,
        'mozAlarms', MockMozAlarms);

      Wifi.maybeToggleWifi();

      assert.equal(MockMozAlarms._id, 'test-id');
      assert.equal(Wifi._alarmId, null);

      stubMozAlarms.restore();
    });

    test('Test getNetworks should be called', function() {
      SettingsListener.mCallbacks['wifi.screen_off_timeout'](100);
      Wifi.wifiDisabledByWakelock = true;
      Wifi.wifiEnabled = true;

      var isGetNetworksCalled = false;
      var isPowerSavingModeEnabled = false;
      var stubMozWifiManager = this.sinon.stub(navigator,
        'mozWifiManager', {
          connection: {
            status: 'disconnected'
          },
          getNetworks: function getNetworks() {
            isGetNetworksCalled = true;
          },
          setPowerSavingMode: function(enabled) {
            isPowerSavingModeEnabled = enabled;
          }
        });

      Wifi.maybeToggleWifi();

      assert.equal(isGetNetworksCalled, true);
      assert.equal(isPowerSavingModeEnabled, false);

      stubMozWifiManager.restore();
    });

    test('Test setPowerSavingMode should be called when screen off ' +
         'and not charging', function() {
      SettingsListener.mCallbacks['wifi.screen_off_timeout'](100);

      ScreenManager.screenEnabled = false;
      Wifi.wifiDisabledByWakelock = true;
      Wifi.wifiWakeLocked = false;
      Wifi.wifiEnabled = true;

      var isPowerSavingModeEnabled;
      var stubMozWifiManager = this.sinon.stub(navigator,
        'mozWifiManager', {
          setPowerSavingMode: function(enabled) {
            isPowerSavingModeEnabled = enabled;
          }
        });

      var stubMozAlarms = this.sinon.stub(navigator,
        'mozAlarms', MockMozAlarms);

      navigator.battery = { charging: false };

      Wifi.maybeToggleWifi();

      assert.equal(isPowerSavingModeEnabled, true);

      navigator.battery = realBattery;
      stubMozAlarms.restore();
      stubMozWifiManager.restore();
    });

    test('Test sleep should be called when mozAlarms doesnt exist', function() {
      SettingsListener.mCallbacks['wifi.screen_off_timeout'](100);

      ScreenManager.screenEnabled = false;
      Wifi.wifiDisabledByWakelock = true;
      stubWifiWakeLockManager.isHeld = true;
      Wifi.wifiEnabled = true;

      var isSleepCalled = false;
      var stubSleep = this.sinon.stub(Wifi, 'sleep', function() {
        isSleepCalled = true;
      });

      // We will test if setPowerSavingMode gets called in other test case.
      // Simply provide
      var stubMozWifiManager = this.sinon.stub(navigator,
        'mozWifiManager', {
          setPowerSavingMode: function(enabled) {}
        });

      var stubMozAlarms = this.sinon.stub(navigator,
        'mozAlarms', null);
      navigator.battery = { charging: false };

      Wifi.maybeToggleWifi();

      assert.equal(isSleepCalled, true);

      navigator.battery = realBattery;
      stubMozAlarms.restore();
      stubSleep.restore();
      stubMozWifiManager.restore();
    });

    test('Test starting with a timer', function() {
      SettingsListener.mCallbacks['wifi.screen_off_timeout'](100);

      ScreenManager.screenEnabled = false;
      Wifi.wifiDisabledByWakelock = true;
      stubWifiWakeLockManager.isHeld = false;
      Wifi.wifiEnabled = true;

      var stubMozAlarms = this.sinon.stub(navigator,
        'mozAlarms', MockMozAlarms);
      var isSetSystemMessageHandlerCalled = false;
      var stubSetSystemMessageHandler =
        this.sinon.stub(Wifi, 'setSystemMessageHandler', function() {
          isSetSystemMessageHandlerCalled = true;
        });
      navigator.battery = { charging: false };

      var stubMozWifiManager = this.sinon.stub(navigator,
        'mozWifiManager', {
          setPowerSavingMode: function(enabled) {}
        });

      Wifi.maybeToggleWifi();

      assert.equal(isSetSystemMessageHandlerCalled, true);
      assert.equal(MockMozAlarms._timezone, 'ignoreTimezone');
      assert.equal(MockMozAlarms._func, 'wifi-off');

      navigator.battery = realBattery;
      stubMozAlarms.restore();
      stubSetSystemMessageHandler.restore();
      stubMozWifiManager.restore();
    });
  });

  suite('sleep', function() {
    setup(function() {
      Wifi.wifiDisabledByWakelock = false;

      MockLock.clear();
      MockDevice.lock();

      stubAddEventListener = this.sinon.stub(window,
        'addEventListener', MockAddEventListener);

      Wifi.sleep();
    });

    teardown(function() {
      stubAddEventListener.restore();
    });

    test('Test wifiDisabledByWakelock should be changed', function() {
      assert.equal(Wifi.wifiDisabledByWakelock, true);
    });

    test('Test wakeLockForWifi should be unlocked', function() {
      fakeClock.tick(30010);

      assert.equal(MockDevice.name, 'cpu');
      assert.equal(MockDevice.isLocked, false);
    });

    test('Test event wifi-disabled listener should be bind', function() {
      MockDevice.lock();
      MockEventListener['wifi-disabled']();

      assert.equal(MockDevice.isLocked, false);
    });

    test('Test locks should be set', function() {
      assert.equal(MockLock.locks[0]['wifi.enabled'], false);
      assert.equal(MockLock.locks[1]['wifi.disabled_by_wakelock'], true);
    });
  });

  suite('setSystemMessageHandler', function() {
    setup(function() {
      Wifi._systemMessageHandlerRegistered = false;
      Wifi.setSystemMessageHandler();
    });

    test('Test _systemMessageHandlerRegistered should be changed', function() {
      assert.equal(Wifi._systemMessageHandlerRegistered, true);
    });
  });

  suite('wifiWakeLock', function() {
    test('Test wifi should stay enabled and in power saving mode', function() {
      // Test flow : Wifi Enabled, Hold Wifi Lock
      //             -> Screen off
      //             ->maybeToggleWifi()
      SettingsListener.mCallbacks['wifi.screen_off_timeout'](100);

      // Screen off while wifi wake lock held.
      MockScreenManager.screenEnabled = false;
      Wifi.wifiDisabledByWakelock = false;
      stubWifiWakeLockManager.isHeld = true;
      Wifi.wifiEnabled = true;
      navigator.battery = { charging: false };

      var isWifiPowerSavingMode = false;
      var isSetPowerSavingModeCalled = false;
      var fakeDOMRequest = {
        onsuccess: function() {},
        onerror: function() {}
      };
      var stubMozWifiManager = this.sinon.stub(navigator,
        'mozWifiManager', {
          setPowerSavingMode: function(enabled) {
            isSetPowerSavingModeCalled = true;
            isWifiPowerSavingMode = enabled;
            return fakeDOMRequest;
          }
      });

      Wifi.maybeToggleWifi();

      // Expect power saving mode API is called with proper state.
      fakeClock.tick(1000);
      assert.equal(isSetPowerSavingModeCalled, true);
      assert.equal(isWifiPowerSavingMode, true);

      // Expect wifi stay enabled.
      fakeDOMRequest.onsuccess();
      fakeClock.tick(1000);
      assert.equal(Wifi.wifiEnabled, true);
      assert.equal(Wifi.wifiDisabledByWakelock, true);

      navigator.battery = realBattery;
      stubMozWifiManager.restore();

      Wifi.wifiEnabled = true;
      stubWifiWakeLockManager.isHeld = true;
      Wifi.wifiDisabledByWakelock = false;
    });

    test('Test wifi should be turned on and in power saving mode', function() {
      // Scenario : Screen off, Wifi Disabled by screen off
      //            -> Hold Wifi Wake Lock
      //            -> maybeToggleWifi()
      SettingsListener.mCallbacks['wifi.screen_off_timeout'](100);

      // wifi wake lock is held after wifi disabled by screen off.
      MockScreenManager.screenEnabled = false;
      Wifi.wifiDisabledByWakelock = true;
      stubWifiWakeLockManager.isHeld = true;
      Wifi.wifiEnabled = false;
      navigator.battery = { charging: false };

      var isWifiPowerSavingMode = false;
      var isSetPowerSavingModeCalled = false;
      var fakeDOMRequest = {
        onsuccess: function() {},
        onerror: function() {}
      };
      var stubMozWifiManager = this.sinon.stub(navigator,
        'mozWifiManager', {
          setPowerSavingMode: function(enabled) {
            isSetPowerSavingModeCalled = true;
            isWifiPowerSavingMode = enabled;
            return fakeDOMRequest;
          }
      });

      MockLock.clear();
      stubWifiWakeLockManager.onwakelockchange(true);

      // Expect wifi becomes enabled.
      assert.equal(MockLock.locks[0]['wifi.enabled'], true);

      // Trigger event to notify Wifi is enabled.
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent('wifi-enabled',
        /* canBubble */ true, /* cancelable */ false, null);
      window.dispatchEvent(evt);

      // Expect power saving mode API is called with proper state.
      assert.equal(isSetPowerSavingModeCalled, true);
      assert.equal(isWifiPowerSavingMode, true);
      assert.equal(Wifi.wifiDisabledByWakelock, true);

      navigator.battery = realBattery;
      stubMozWifiManager.restore();

      Wifi.wifiEnabled = true;
      stubWifiWakeLockManager.isHeld = true;
      Wifi.wifiDisabledByWakelock = false;
    });

    test('Test wifi should stay disabled', function() {
      // Scenario : Screen off, Wifi Disabled by user
      //            -> Hold Wifi Wake Lock
      //            -> maybeToggleWifi()
      SettingsListener.mCallbacks['wifi.screen_off_timeout'](100);

      // wifi wake lock is held after wifi disabled by screen off.
      MockScreenManager.screenEnabled = false;
      Wifi.wifiDisabledByWakelock = false;
      stubWifiWakeLockManager.isHeld = true;
      Wifi.wifiEnabled = false;
      navigator.battery = { charging: false };

      var isWifiPowerSavingMode = false;
      var isSetPowerSavingModeCalled = false;
      var fakeDOMRequest = {
        onsuccess: function() {},
        onerror: function() {}
      };
      var stubMozWifiManager = this.sinon.stub(navigator,
        'mozWifiManager', {
          setPowerSavingMode: function(enabled) {
            isSetPowerSavingModeCalled = true;
            isWifiPowerSavingMode = enabled;
            return fakeDOMRequest;
          }
      });

      stubWifiWakeLockManager.onwakelockchange(true);

      // Expect wifi stay enabled and enter power saving mode.
      assert.equal(Wifi.wifiEnabled, false);
      assert.equal(isSetPowerSavingModeCalled, false);
      assert.equal(isWifiPowerSavingMode, false);
      assert.equal(Wifi.wifiDisabledByWakelock, false);

      navigator.battery = realBattery;
      stubMozWifiManager.restore();

      Wifi.wifiEnabled = false;
      stubWifiWakeLockManager.isHeld = false;
      Wifi.wifiDisabledByWakelock = false;
    });

    test('Test wifi should be turned on in power saving mode, then turn off.',
      function() {
      // Scenario : Screen off, Wifi Disabled by screen off
      //            -> Hold Wifi Wake Lock
      //            -> maybeToggleWifi()
      //            -> release Wifi Wake Lock
      //            -> maybeToggleWifi()
      SettingsListener.mCallbacks['wifi.screen_off_timeout'](100);

      // wifi wake lock is held after wifi disabled by screen off.
      MockScreenManager.screenEnabled = false;
      Wifi.wifiDisabledByWakelock = true;
      stubWifiWakeLockManager.isHeld = true;
      Wifi.wifiEnabled = false;
      navigator.battery = { charging: false };

      var isWifiPowerSavingMode = false;
      var isSetPowerSavingModeCalled = false;
      var fakeDOMRequest = {
        onsuccess: function() {},
        onerror: function() {}
      };
      var stubMozWifiManager = this.sinon.stub(navigator,
        'mozWifiManager', {
          setPowerSavingMode: function(enabled) {
            isSetPowerSavingModeCalled = true;
            isWifiPowerSavingMode = enabled;
            return fakeDOMRequest;
          }
      });

      MockLock.clear();
      stubWifiWakeLockManager.onwakelockchange(false);

      // Expect wifi becomes enabled.
      assert.equal(MockLock.locks[0]['wifi.enabled'], true);

      // Trigger event to notify Wifi is enabled.
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent('wifi-enabled',
        /* canBubble */ true, /* cancelable */ false, null);
      window.dispatchEvent(evt);

      // Expect power saving mode API is called with proper state.
      assert.equal(isSetPowerSavingModeCalled, true);
      assert.equal(isWifiPowerSavingMode, true);
      assert.equal(Wifi.wifiDisabledByWakelock, true);

      // Release Wifi wake lock.
      MockLock.clear();
      Wifi.wifiEnabled = true;
      stubWifiWakeLockManager.isHeld = false;
      Wifi.maybeToggleWifi();

      // Expect wifi becomes disabled.
      fakeClock.tick(110);
      assert.equal(MockLock.locks[0]['wifi.enabled'], false);
      assert.equal(MockLock.locks[1]['wifi.disabled_by_wakelock'], true);

      navigator.battery = realBattery;
      stubMozWifiManager.restore();

      Wifi.wifiEnabled = false;
      Wifi.wifiWakeLocked = true;
      Wifi.wifiDisabledByWakelock = true;
    });
  });
});
