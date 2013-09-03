'use strict';

mocha.globals(['SettingsListener', 'AirplaneMode']);

requireApp('system/test/unit/mock_wifi_manager.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');

var MockMozSettings = {
  _listeners: {},

  addObserver: function addObserver(event, listener) {
    this._listeners[event] = listener;
  }
};

var MockMozBluetooth = {};

var MockMozMobileConnection = {
  data: {}
};

var MockMozFMRadio = {
  enabled: true,
  disable: function disable() {
    this.enabled = false;
  },
  enable: function enable() {
    this.enabled = true;
  }
};

suite('airplane mode >', function() {
  var stubMozBluetooth;

  var realSettingsListener;
  var realMozFMRadio;
  var realMozMobileConnection;
  var realMozSettings;
  var realMockWifiManager;

  var settings = {
    // mozSetting state for Data connection, Bluetooth, Wifi, GPS
    'ril.data.enabled': false,
    'bluetooth.enabled': false,
    'wifi.enabled': false,
    'geolocation.enabled': false,

    // remember the mozSetting states before the airplane mode disables them
    'ril.data.suspended': false,
    'bluetooth.suspended': false,
    'wifi.suspended': false,
    'geolocation.suspended': false
  };

  setup(function(done) {
    Object.defineProperty(navigator, 'mozBluetooth', {
      writable: true
    });

    stubMozBluetooth = this.sinon.stub(navigator,
      'mozBluetooth', MockMozBluetooth);

    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockMozSettings;

    realMockWifiManager = navigator.mozWifiManager;
    navigator.mozWifiManager = MockWifiManager;

    realMozFMRadio = navigator.mozFMRadio;
    navigator.mozFMRadio = MockMozFMRadio;

    realMozMobileConnection = navigator.mozMobileConnection;
    navigator.mozMobileConnection = MockMozMobileConnection;

    realSettingsListener = window.SettingsListener;
    window.SettingsListener = MockSettingsListener;

    requireApp('system/js/airplane_mode.js', done);
  });

  teardown(function() {
    stubMozBluetooth.restore();

    window.SettingsListener = realSettingsListener;
    navigator.mozFMRadio = realMozFMRadio;
    navigator.mozMobileConnection = realSettingsListener;
    navigator.mozSettings = realMozSettings;
    navigator.mozWifiManager = realMockWifiManager;
  });

  suite('init', function() {
    test('test ril.radio.disabled(true) when devices enabled are false',
    function() {
      MockLock.clear();
      AirplaneMode.enabled = false;

      SettingsListener.mCallbacks['ril.radio.disabled'](true);

      assert.isTrue(AirplaneMode.enabled);
      assert.isFalse(MockMozFMRadio.enabled);

      assert.isFalse(MockLock.locks[0]['ril.data.suspended']);
      assert.isFalse(MockLock.locks[1]['bluetooth.suspended']);
      assert.isFalse(MockLock.locks[2]['wifi.suspended']);
      assert.isFalse(MockLock.locks[3]['tethering.wifi.enabled']);
      assert.isFalse(MockLock.locks[4]['geolocation.suspended']);
    });

    test('test ril.radio.disabled(false) when devices suspended are false',
    function() {
      MockLock.clear();
      AirplaneMode.enabled = true;
      MockWifiManager.enabled = false;

      SettingsListener.mCallbacks['ril.radio.disabled'](false);

      assert.isFalse(AirplaneMode.enabled);

      assert.isFalse(MockLock.locks[0]['ril.data.suspended']);
      assert.isFalse(MockLock.locks[1]['bluetooth.suspended']);
      assert.isFalse(MockLock.locks[2]['wifi.suspended']);
      assert.isFalse(MockLock.locks[3]['geolocation.suspended']);
    });

    test('test ril.radio.disabled(true) when devices enabled are true',
    function() {
      MockLock.clear();
      AirplaneMode.enabled = false;

      SettingsListener.mCallbacks['ril.data.enabled'](true);
      SettingsListener.mCallbacks['bluetooth.enabled'](true);
      SettingsListener.mCallbacks['wifi.enabled'](true);
      SettingsListener.mCallbacks['geolocation.enabled'](true);

      SettingsListener.mCallbacks['ril.radio.disabled'](true);

      assert.isTrue(AirplaneMode.enabled);
      assert.isFalse(MockMozFMRadio.enabled);

      assert.isTrue(MockLock.locks[0]['ril.data.suspended']);
      assert.isFalse(MockLock.locks[1]['ril.data.enabled']);
      assert.isTrue(MockLock.locks[2]['bluetooth.suspended']);
      assert.isFalse(MockLock.locks[3]['bluetooth.enabled']);
      assert.isTrue(MockLock.locks[4]['wifi.suspended']);
      assert.isFalse(MockLock.locks[5]['wifi.enabled']);
      assert.isFalse(MockLock.locks[6]['tethering.wifi.enabled']);
      assert.isTrue(MockLock.locks[7]['geolocation.suspended']);
      assert.isFalse(MockLock.locks[8]['geolocation.enabled']);
    });

    test('test ril.radio.disabled(false) when devices suspended are true',
    function() {
      MockLock.clear();
      AirplaneMode.enabled = true;
      MockWifiManager.enabled = false;

      SettingsListener.mCallbacks['ril.data.enabled'](false);
      SettingsListener.mCallbacks['bluetooth.enabled'](false);
      SettingsListener.mCallbacks['wifi.enabled'](false);
      SettingsListener.mCallbacks['geolocation.enabled'](false);

      SettingsListener.mCallbacks['ril.data.suspended'](true);
      SettingsListener.mCallbacks['bluetooth.suspended'](true);
      SettingsListener.mCallbacks['wifi.suspended'](true);
      SettingsListener.mCallbacks['geolocation.suspended'](true);

      SettingsListener.mCallbacks['ril.radio.disabled'](false);

      assert.isFalse(AirplaneMode.enabled);

      assert.isFalse(MockLock.locks[0]['ril.data.suspended']);
      assert.isTrue(MockLock.locks[1]['ril.data.enabled']);
      assert.isFalse(MockLock.locks[2]['bluetooth.suspended']);
      assert.isTrue(MockLock.locks[3]['bluetooth.enabled']);
      assert.isFalse(MockLock.locks[4]['wifi.suspended']);
      assert.isTrue(MockLock.locks[5]['wifi.enabled']);
      assert.isFalse(MockLock.locks[6]['geolocation.suspended']);
      assert.isTrue(MockLock.locks[7]['geolocation.enabled']);
    });
  });
});
