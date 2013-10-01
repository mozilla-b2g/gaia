'use strict';

mocha.globals(['SettingsListener', 'Bluetooth']);

requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');

var MockMozSettings = {
  _listeners: {},

  addObserver: function addObserver(event, listener) {
    this._listeners[event] = listener;
  }
};

var MockMozBluetooth = {
  _req: {
    result: {
      object_identity: 'custom_adapter',
      isScoConnected: false,
      disconnectSco: function disconnectSco() {
        this.isScoConnected = false;
      },
      connectSco: function connectSco() {
        this.isScoConnected = true;
      }
    }
  },
  enabled: true,
  isConnected: true,
  getDefaultAdapter: function getDefaultAdapter() {
    return this._req;
  }
};

var MockMozTelephony = {
  active: true
};

var MockMozSetMessageHandler_listeners = {};
function MockMozSetMessageHandler(event, listener) {
  MockMozSetMessageHandler_listeners[event] = listener;
}

function clearConnection() {
  var profiles = Bluetooth.Profiles;
  for (var name in profiles) {
    Bluetooth._setProfileConnected(profiles[name], false);
  }
}

function include(arr, obj) {
  for (var i = 0; i < arr.length; i++) {
    if (arr[i] == obj) return true;
  }
  return false;
}

suite('blueTooth >', function() {
  var realMozSettings;
  var realSettingsListener;
  var realMozSetMessageHandler;
  var realMozBluetooth;
  var realMozTelephony;

  setup(function(done) {
    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockMozSettings;

    realSettingsListener = window.SettingsListener;
    window.SettingsListener = MockSettingsListener;

    realMozSetMessageHandler = navigator.mozSetMessageHandler;
    navigator.mozSetMessageHandler = MockMozSetMessageHandler;

    realMozBluetooth = navigator.mozBluetooth;
    Object.defineProperty(navigator, 'mozBluetooth', {
      writable: true
    });
    navigator.mozBluetooth = MockMozBluetooth;

    realMozTelephony = navigator.mozTelephony;
    Object.defineProperty(navigator, 'mozTelephony', {
      writable: true
    });
    navigator.mozTelephony = MockMozTelephony;

    requireApp('system/js/bluetooth.js', done);
  });

  teardown(function() {
    navigator.mozSettings = realMozSettings;
    window.SettingsListener = realSettingsListener;
    navigator.mozSetMessageHandler = realMozSetMessageHandler;
    navigator.mozBluetooth = realMozBluetooth;
    navigator.mozTelephony = realMozTelephony;
  });

  suite('init', function() {
    setup(function() {
      clearConnection();
    });

    test('Test initDefaultAdapter is called', function() {
      assert.equal(typeof MockMozBluetooth._req.onsuccess, 'function');

      MockMozBluetooth._req.onsuccess(null);
      assert.equal(Bluetooth.getAdapter().object_identity, 'custom_adapter');
    });

    test('Test adapter.onhfpstatuschanged', function(done) {
      Bluetooth.connected = false;

      var asyncAssertFlag = {};
      var checkAsyncAssertComplete = function(evt) {
        if (asyncAssertFlag['checkConnectionChange'] &&
            asyncAssertFlag['checkProfileConnectionChange'] &&
            asyncAssertFlag['mainTestThread']) {

          window.removeEventListener('bluetoothconnectionchange',
            checkConnectionChange, false);
          window.removeEventListener('bluetoothprofileconnectionchange',
            checkProfileConnectionChange, false);
          window.removeEventListener('checkasyncassertcomplete',
            checkAsyncAssertComplete, false);
          done();
        }
      };

      var checkConnectionChange = function(evt) {
        assert.isTrue(evt.detail.deviceConnected);

        asyncAssertFlag['checkConnectionChange'] = true;
        window.dispatchEvent(new Event('checkasyncassertcomplete'));
      };
      var checkProfileConnectionChange = function(evt) {
        assert.equal(evt.detail.name, Bluetooth.Profiles.HFP);
        assert.isTrue(evt.detail.connected);

        asyncAssertFlag['checkProfileConnectionChange'] = true;
        window.dispatchEvent(new Event('checkasyncassertcomplete'));
      };

      window.addEventListener('bluetoothconnectionchange',
        checkConnectionChange, false);
      window.addEventListener('bluetoothprofileconnectionchange',
        checkProfileConnectionChange, false);
      window.addEventListener('checkasyncassertcomplete',
        checkAsyncAssertComplete, false);

      var fakeEvt = { status: true };
      Bluetooth.getAdapter().onhfpstatuschanged(fakeEvt);

      assert.isTrue(Bluetooth.isProfileConnected(Bluetooth.Profiles.HFP));

      asyncAssertFlag['mainTestThread'] = true;
      window.dispatchEvent(new Event('checkasyncassertcomplete'));
    });

    test('Test adapter.ona2dpstatuschanged', function(done) {
      Bluetooth.connected = false;

      var asyncAssertFlag = {};
      var checkAsyncAssertComplete = function(evt) {
        if (asyncAssertFlag['checkConnectionChange'] &&
            asyncAssertFlag['checkProfileConnectionChange'] &&
            asyncAssertFlag['mainTestThread']) {

          window.removeEventListener('bluetoothconnectionchange',
            checkConnectionChange, false);
          window.removeEventListener('bluetoothprofileconnectionchange',
            checkProfileConnectionChange, false);
          window.removeEventListener('checkasyncassertcomplete',
            checkAsyncAssertComplete, false);
          done();
        }
      };

      var checkConnectionChange = function(evt) {
        assert.isTrue(evt.detail.deviceConnected);

        asyncAssertFlag['checkConnectionChange'] = true;
        window.dispatchEvent(new Event('checkasyncassertcomplete'));
      };
      var checkProfileConnectionChange = function(evt) {
        assert.equal(evt.detail.name, Bluetooth.Profiles.A2DP);
        assert.isTrue(evt.detail.connected);

        asyncAssertFlag['checkProfileConnectionChange'] = true;
        window.dispatchEvent(new Event('checkasyncassertcomplete'));
      };

      window.addEventListener('bluetoothconnectionchange',
        checkConnectionChange, false);
      window.addEventListener('bluetoothprofileconnectionchange',
        checkProfileConnectionChange, false);
      window.addEventListener('checkasyncassertcomplete',
        checkAsyncAssertComplete, false);

      var fakeEvt = { status: true };
      Bluetooth.getAdapter().ona2dpstatuschanged(fakeEvt);

      assert.isTrue(Bluetooth.
        isProfileConnected(Bluetooth.Profiles.A2DP));

      asyncAssertFlag['mainTestThread'] = true;
      window.dispatchEvent(new Event('checkasyncassertcomplete'));
    });

    test('Test adapter.onscostatuschanged', function() {

      var fakeEvt = { status: true };
      Bluetooth.getAdapter().onscostatuschanged(fakeEvt);

      assert.isTrue(Bluetooth.isProfileConnected(Bluetooth.Profiles.SCO));
    });
  });

  suite('connect/disconnect SCO ' +
    'when telephony.speaker.enabled changes', function() {
    setup(function() {
      clearConnection();
      var fakeEvt = { status: true, settingValue: true };
      Bluetooth.getAdapter().onhfpstatuschanged(fakeEvt);
    });

    test('Test mozSettings observe when settingValue is true', function() {
      Bluetooth.getAdapter().connectSco();

      var fakeEvt = { status: true, settingValue: true };
      MockMozSettings._listeners['telephony.speaker.enabled'](fakeEvt);

      assert.isFalse(Bluetooth.getAdapter().isScoConnected);
    });

    test('Test mozSettings observe when settingValue is false', function() {
      Bluetooth.getAdapter().disconnectSco();

      var fakeEvt = { status: true, settingValue: false };
      MockMozSettings._listeners['telephony.speaker.enabled'](fakeEvt);

      assert.isTrue(Bluetooth.getAdapter().isScoConnected);
    });

    test('Test mozSettings observe when telephony.active is false', function() {
      MockMozTelephony.active = false;
      Bluetooth.getAdapter().connectSco();

      var fakeEvt = { status: true, settingValue: true };
      MockMozSettings._listeners['telephony.speaker.enabled'](fakeEvt);

      assert.isTrue(Bluetooth.getAdapter().isScoConnected);
    });
  });

  suite('mozBluetooth callbacks', function() {
    test('Test mozBluetooth.ondisabled', function(done) {
      var checkBluetoothDisabled = function(evt) {
        assert.equal(evt.type, 'bluetooth-disabled');
        window.removeEventListener('bluetooth-disabled',
          checkBluetoothDisabled, false);
        done();
      };
      window.addEventListener('bluetooth-disabled',
        checkBluetoothDisabled, false);

      navigator.mozBluetooth.ondisabled();
    });

    test('Test mozBluetooth.onadapteradded', function(done) {
      var stubInitDefaultAdapter =
        this.sinon.spy(Bluetooth, 'initDefaultAdapter');

      var asyncAssertFlag = {};
      var checkAsyncAssertComplete = function(evt) {
        if (asyncAssertFlag['checkBluetoothAdapterAdded'] &&
            asyncAssertFlag['mainTestThread']) {

          window.removeEventListener('bluetooth-adapter-added',
            checkBluetoothAdapterAdded, false);
          stubInitDefaultAdapter.restore();
          window.removeEventListener('checkasyncassertcomplete',
            checkAsyncAssertComplete, false);
          done();
        }
      };

      var checkBluetoothAdapterAdded = function(evt) {
        assert.equal(evt.type, 'bluetooth-adapter-added');

        asyncAssertFlag['checkBluetoothAdapterAdded'] = true;
        window.dispatchEvent(new Event('checkasyncassertcomplete'));
      };
      window.addEventListener('bluetooth-adapter-added',
        checkBluetoothAdapterAdded, false);
      window.addEventListener('checkasyncassertcomplete',
        checkAsyncAssertComplete, false);

      navigator.mozBluetooth.onadapteradded();
      assert.isTrue(stubInitDefaultAdapter.called);

      asyncAssertFlag['mainTestThread'] = true;
      window.dispatchEvent(new Event('checkasyncassertcomplete'));
    });
  });

  suite('mozSetMessageHandler', function() {
    setup(function() {
      clearConnection();
    });

    test('Test mozSetMessageHandler bluetooth-opp-transfer-start', function() {
      var stubUpdateConnected = this.sinon.spy(Bluetooth, 'updateConnected');

      var asyncAssertFlag = {};
      var checkAsyncAssertComplete = function(evt) {
        if (asyncAssertFlag['checkTransferStart'] &&
            asyncAssertFlag['mainTestThread']) {

          window.removeEventListener('bluetooth-opp-transfer-start',
            checkTransferStart, false);
          stubUpdateConnected.restore();
          window.removeEventListener('checkasyncassertcomplete',
            checkAsyncAssertComplete, false);
          done();
        }
      };

      var checkTransferStart = function(evt) {
        assert.equal(evt.type, 'bluetooth-opp-transfer-complete');

        asyncAssertFlag['checkTransferStart'] = true;
        window.dispatchEvent(new Event('checkasyncassertcomplete'));
      };
      window.addEventListener('bluetooth-opp-transfer-start',
        checkTransferStart, false);
      window.addEventListener('checkasyncassertcomplete',
        checkAsyncAssertComplete, false);

      MockMozSetMessageHandler_listeners['bluetooth-opp-transfer-start']('dummy_message');

      assert.isTrue(include(Bluetooth.getCurrentProfiles(), 'opp'));
      assert.isTrue(stubUpdateConnected.called);

      asyncAssertFlag['mainTestThread'] = true;
      window.dispatchEvent(new Event('checkasyncassertcomplete'));
    });

    test('Test mozSetMessageHandler bluetooth-opp-transfer-complete',
    function() {
      var stubUpdateConnected = this.sinon.spy(Bluetooth, 'updateConnected');

      var asyncAssertFlag = {};
      var checkAsyncAssertComplete = function(evt) {
        if (asyncAssertFlag['checkTransferComplete'] &&
            asyncAssertFlag['mainTestThread']) {

          window.removeEventListener('bluetooth-opp-transfer-complete',
            checkTransferStart, false);
          stubUpdateConnected.restore();
          window.removeEventListener('checkasyncassertcomplete',
            checkAsyncAssertComplete, false);
          done();
        }
      };

      var checkTransferComplete = function(evt) {
        assert.equal(evt.type, 'bluetooth-opp-transfer-complete');

        asyncAssertFlag['checkTransferComplete'] = true;
        window.dispatchEvent(new Event('checkasyncassertcomplete'));
      };
      window.addEventListener('bluetooth-opp-transfer-complete',
        checkTransferComplete, false);
      window.addEventListener('checkasyncassertcomplete',
        checkAsyncAssertComplete, false);

      MockMozSetMessageHandler_listeners['bluetooth-opp-transfer-complete']('dummy_message');

      assert.isFalse(include(Bluetooth.getCurrentProfiles(), 'opp'));
      assert.isTrue(stubUpdateConnected.called);

      asyncAssertFlag['mainTestThread'] = true;
      window.dispatchEvent(new Event('checkasyncassertcomplete'));
    });
  });
});
