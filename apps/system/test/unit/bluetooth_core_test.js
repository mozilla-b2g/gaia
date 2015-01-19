/* global MockMozBluetooth, Bluetooth, BluetoothTransfer,
   NfcHandoverManager, BaseModule */
'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_bluetooth.js');
requireApp('system/js/base_module.js');

function switchReadOnlyProperty(originObject, propName, targetObj) {
  Object.defineProperty(originObject, propName, {
    configurable: true,
    get: function() { return targetObj; }
  });
}

suite('system/BluetoothCore', function() {
  var realMozBluetooth;

  setup(function(done) {
    this.sinon.useFakeTimers();

    realMozBluetooth = navigator.mozBluetooth;
    switchReadOnlyProperty(navigator, 'mozBluetooth', MockMozBluetooth);

    window.Bluetooth = { init: function() {} };
    window.BluetoothTransfer = { init: function() {} };
    window.NfcHandoverManager = { init: function() {} };

    requireApp('system/js/service.js');
    requireApp('system/js/bluetooth_core.js', done);
  });

  teardown(function() {
    switchReadOnlyProperty(navigator, 'mozBluetooth', realMozBluetooth);
  });

  suite('BluetoothCore API', function() {
    var subject;
    setup(function() {
      this.sinon.stub(Bluetooth, 'init');
      this.sinon.stub(BluetoothTransfer, 'init');
      this.sinon.stub(NfcHandoverManager, 'init');
      subject = BaseModule.instantiate('BluetoothCore');
      subject.start();
    });

    teardown(function() {
      subject.stop();
    });

    test('read', function() {
      assert.ok(Bluetooth.init.called);
      assert.ok(BluetoothTransfer.init.called);
      assert.ok(NfcHandoverManager.init.called);
    });
  });
});
