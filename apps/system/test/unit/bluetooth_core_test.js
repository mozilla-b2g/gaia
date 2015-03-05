/* global MockMozBluetooth, Bluetooth, BluetoothTransfer, BaseModule,
          MockLazyLoader */
'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_bluetooth.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/base_icon.js');
requireApp('system/js/bluetooth_icon.js');
requireApp('system/js/bluetooth_transfer_icon.js');
requireApp('system/js/bluetooth_headphone_icon.js');
requireApp('system/test/unit/mock_lazy_loader.js');

function switchReadOnlyProperty(originObject, propName, targetObj) {
  Object.defineProperty(originObject, propName, {
    configurable: true,
    get: function() { return targetObj; }
  });
}

suite('system/BluetoothCore', function() {
  var realMozBluetooth;

  setup(function(done) {
    window.LazyLoader = MockLazyLoader;
    this.sinon.useFakeTimers();

    realMozBluetooth = navigator.mozBluetooth;
    switchReadOnlyProperty(navigator, 'mozBluetooth', MockMozBluetooth);

    window.Bluetooth = { start: this.sinon.spy() };
    window.BluetoothTransfer = { start: this.sinon.spy() };

    requireApp('system/js/bluetooth_core.js', done);
  });

  teardown(function() {
    switchReadOnlyProperty(navigator, 'mozBluetooth', realMozBluetooth);
  });

  suite('BluetoothCore API', function() {
    var subject;
    setup(function() {
      subject = BaseModule.instantiate('BluetoothCore');
    });

    teardown(function() {
      subject.stop();
    });

    test('read', function() {
      subject._start();
      assert.ok(Bluetooth.start.called);
      assert.ok(BluetoothTransfer.start.called);
    });
  });
});
