/* global MockMozBluetooth, MockBTAdapter, BluetoothManager, MockEventTarget,
          MockDiscoveryHandle */
'use strict';

require('/bower_components/evt/index.js');
require('/shared/test/unit/mocks/mock_event_target.js');
require('/shared/test/unit/mocks/mock_navigator_moz_bluetooth_v2.js');
require('/js/bluetooth_loader.js');
require('/js/bluetooth_manager.js');

suite('device-deck/BluetoothManager', function() {

  var realMozBluetooth;
  var bluetoothManager;

  suiteSetup(function() {
    var MockDiscoveryHandle = function() {
      this.ondevicefound = null;
    };
    MockDiscoveryHandle.prototype = Object.create(MockEventTarget.prototype);
    window.MockDiscoveryHandle = MockDiscoveryHandle;

    realMozBluetooth = navigator.mozBluetooth;
    switchReadOnlyProperty(navigator, 'mozBluetooth', MockMozBluetooth);
  });

  suiteTeardown(function() {
    window.MockDiscoveryHandle = undefined;
    switchReadOnlyProperty(navigator, 'mozBluetooth', realMozBluetooth);
  });

  var switchReadOnlyProperty = function (originObject, propName, targetObj) {
    Object.defineProperty(originObject, propName, {
      configurable: true,
      get: function() { return targetObj; }
    });
  };

  var setupMockAdapterAndGetHandle = function(context, mockDiscoveryHandle) {
    mockDiscoveryHandle = new MockDiscoveryHandle();
    MockBTAdapter.state = 'enabled';
    MockBTAdapter.startDiscovery = function() {};
    MockBTAdapter.stopDiscovery = function() {};
    context.sinon.stub(MockBTAdapter, 'startDiscovery', function() {
      return Promise.resolve(mockDiscoveryHandle);
    });

    context.sinon.stub(MockBTAdapter, 'stopDiscovery', function() {
      return Promise.resolve();
    });

    return mockDiscoveryHandle;
  };

  var teardownMockAdapter = function(mockDiscoveryHandle) {
    MockBTAdapter.startDiscovery.restore();
    MockBTAdapter.stopDiscovery.restore();
    if (mockDiscoveryHandle) {
      mockDiscoveryHandle = undefined;
    }
  };

  suite('init()', function() {
    setup(function() {
      bluetoothManager = new BluetoothManager();
    });
    teardown(function() {
      bluetoothManager = undefined;
    });

    test('should handle "attributechanged" event after init', function() {
      var onAttributeChangedSpy =
        this.sinon.spy(bluetoothManager, 'onAttributeChanged');
      bluetoothManager.init();

      MockMozBluetooth.triggerEventListeners('attributechanged', {
        type: 'attributechanged',
        attrs: []
      });

      assert.isTrue(onAttributeChangedSpy.calledOnce);
      assert.equal(
        onAttributeChangedSpy.firstCall.args[0].type, 'attributechanged');
    });

    test('should fire "default-adapter-ready" event when evt.attr of ' +
      ' attributechanged contains defaultAdapter', function() {
      var stub = this.sinon.stub();
      bluetoothManager.init();
      bluetoothManager.on('default-adapter-ready', stub);

      MockMozBluetooth.triggerEventListeners('attributechanged', {
        type: 'attributechanged',
        attrs: ['defaultAdapter']
      });

      assert.isTrue(stub.calledOnce);
    });
  });

  suite('safelyStartDiscovery()', function() {
    setup(function() {
      setupMockAdapterAndGetHandle(this);

      bluetoothManager = new BluetoothManager();
      bluetoothManager.init();
    });
    teardown(function() {
      teardownMockAdapter();
      bluetoothManager = undefined;
    });

    test('should invoke startDiscovery() of defaultAdapter', function(done) {
      bluetoothManager.safelyStartDiscovery().then(function() {
        assert.isTrue(MockBTAdapter.startDiscovery.calledOnce);
      }).then(done, done);
    });
  });

  suite('safelyStopDiscovery()', function() {
    setup(function(done) {
      setupMockAdapterAndGetHandle(this);

      bluetoothManager = new BluetoothManager();
      bluetoothManager.init();
      bluetoothManager.safelyStartDiscovery().then(done);
    });
    teardown(function() {
      teardownMockAdapter();
      bluetoothManager = undefined;
    });

    test('should invoke stopDiscovery() of defaultAdapter', function(done) {
      bluetoothManager.safelyStopDiscovery().then(function() {
        assert.isTrue(MockBTAdapter.stopDiscovery.calledOnce);
      }).then(done, done);
    });
  });

  suite('onDeviceFound()', function() {
    var mockDiscoveryHandle;
    var onDeviceFoundSpy;

    setup(function() {
      mockDiscoveryHandle = setupMockAdapterAndGetHandle(this);

      bluetoothManager = new BluetoothManager();
      onDeviceFoundSpy = this.sinon.spy(bluetoothManager, 'onDeviceFound');

      bluetoothManager.init();
    });
    teardown(function() {
      teardownMockAdapter();
      onDeviceFoundSpy.restore();
      bluetoothManager = undefined;
    });

    test('should fire "device-found" event when receiving "devicefound" from ' +
      'mozBluetooth', function(done) {
        var deviceFoundEvent = {
          type: 'devicefound',
          device: 'fake-device-data'
        };
        var stub = this.sinon.stub();
        bluetoothManager.on('device-found', stub);

        bluetoothManager.safelyStartDiscovery().then(function() {
          mockDiscoveryHandle.dispatchEvent(deviceFoundEvent);
          assert.isTrue(onDeviceFoundSpy.calledWithExactly(deviceFoundEvent));
          assert.isTrue(
            stub.calledWithExactly(deviceFoundEvent.device));
        }).then(done, done);
      });
  });
});
