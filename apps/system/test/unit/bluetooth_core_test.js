/* global MockMozBluetooth, BaseModule */
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

    window.Bluetooth1 = { init: function() {} };
    window.BluetoothTransfer1 = { init: function() {} };
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
      this.sinon.stub(window.Bluetooth1, 'init');
      this.sinon.stub(window.BluetoothTransfer1, 'init');
      this.sinon.stub(window.NfcHandoverManager, 'init');
      subject = BaseModule.instantiate('BluetoothCore');
      subject.start();
    });

    teardown(function() {
      subject.stop();
    });

    test('read', function() {
      assert.ok(window.Bluetooth1.init.called);
      assert.ok(window.BluetoothTransfer1.init.called);
      assert.ok(window.NfcHandoverManager.init.called);
    });
  });
});
