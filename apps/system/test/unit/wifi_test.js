'use strict';

mocha.globals(['SettingsListener', 'ScreenManager',
  'Wifi', 'addEventListener']);

requireApp('system/test/unit/mock_wifi_manager.js');
requireApp('system/test/unit/mock_navigator_moz_power.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');

var MockMozSettings = {
  _listeners: {},

  addObserver: function addObserver(event, listener) {
    this._listeners[event] = listener;
  }
};

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

  var fakeClock;

  var realSettingsListener;
  var realScreenManager;
  var realMozSetMessageHandler;
  var realBattery;
  var realMozPower;

  setup(function(done) {
    stubMozSettings = this.sinon.stub(navigator,
      'mozSettings', MockMozSettings);
    stubWifiManager = this.sinon.stub(navigator,
      'mozWifiManager', MockWifiManager);
    stubRequestWakeLock = this.sinon.stub(navigator,
      'requestWakeLock', MockRequestWakeLock);

    fakeClock = this.sinon.useFakeTimers();

    realScreenManager = window.ScreenManager;
    window.ScreenManager = MockScreenManager;
    realSettingsListener = window.SettingsListener;
    window.SettingsListener = MockSettingsListener;
    realMozSetMessageHandler = navigator.mozSetMessageHandler;
    navigator.mozSetMessageHandler = MockMozSetMessageHandler;

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

    requireApp('system/js/wifi.js', done);
  });

  teardown(function() {
    stubMozSettings.restore();
    stubWifiManager.restore();
    stubRequestWakeLock.restore();
    fakeClock.restore();

    window.SettingsListener = realSettingsListener;
    window.ScreenManager = realScreenManager;
    navigator.mozSetMessageHandler = realMozSetMessageHandler;
    navigator.mozPower = realMozPower;
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
      var stubMozWifiManager = this.sinon.stub(navigator,
        'mozWifiManager', {
          connection: {
            status: 'disconnected'
          },
          getNetworks: function getNetworks() {
            isGetNetworksCalled = true;
          }
        });

      Wifi.maybeToggleWifi();

      assert.equal(isGetNetworksCalled, true);

      stubMozWifiManager.restore();
    });

    test('Test sleep should be called when mozAlarms doesnt exist', function() {
      SettingsListener.mCallbacks['wifi.screen_off_timeout'](100);

      ScreenManager.screenEnabled = false;
      Wifi.wifiDisabledByWakelock = true;
      Wifi.wifiWakeLocked = false;
      Wifi.wifiEnabled = true;

      var isSleepCalled = false;
      var stubSleep = this.sinon.stub(Wifi, 'sleep', function() {
        isSleepCalled = true;
      });
      var stubMozAlarms = this.sinon.stub(navigator,
        'mozAlarms', null);
      navigator.battery = { charging: false };

      Wifi.maybeToggleWifi();

      assert.equal(isSleepCalled, true);

      navigator.battery = realBattery;
      stubMozAlarms.restore();
      stubSleep.restore();
    });

    test('Test starting with a timer', function() {
      SettingsListener.mCallbacks['wifi.screen_off_timeout'](100);

      ScreenManager.screenEnabled = false;
      Wifi.wifiDisabledByWakelock = true;
      Wifi.wifiWakeLocked = false;
      Wifi.wifiEnabled = true;

      var stubMozAlarms = this.sinon.stub(navigator,
        'mozAlarms', MockMozAlarms);
      var isSetSystemMessageHandlerCalled = false;
      var stubSetSystemMessageHandler =
        this.sinon.stub(Wifi, 'setSystemMessageHandler', function() {
          isSetSystemMessageHandlerCalled = true;
        });
      navigator.battery = { charging: false };

      Wifi.maybeToggleWifi();

      assert.equal(isSetSystemMessageHandlerCalled, true);
      assert.equal(MockMozAlarms._timezone, 'ignoreTimezone');
      assert.equal(MockMozAlarms._func, 'wifi-off');

      navigator.battery = realBattery;
      stubMozAlarms.restore();
      stubSetSystemMessageHandler.restore();
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
});
