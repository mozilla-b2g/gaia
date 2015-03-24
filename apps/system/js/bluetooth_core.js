/* exported BluetoothCore */
/* global BaseModule, LazyLoader, Bluetooth1, Bluetooth2,
   BluetoothTransfer */
'use strict';

(function() {
  var BluetoothCore = function(bluetooth) {
    this.bluetooth = bluetooth;
  };

  /**
   * BluetoothCore handle bluetooth related function and bootstrap
   * modules for v1/v2 API.
   *
   * @class BluetoothCore
   */
  BaseModule.create(BluetoothCore, {
    name: 'BluetoothCore',

    start: function() {
      // init Bluetooth module
      if (typeof(window.navigator.mozBluetooth.onattributechanged) ===
        'undefined') { // APIv1
        LazyLoader.load(['js/bluetooth_transfer.js', 'js/bluetooth.js'],
          function() {
            BluetoothTransfer.start();
            window.Bluetooth = Bluetooth1;
            window.Bluetooth.init();
        });
      } else { // APIv2
        // Now only make sure statusbar works
        // BluetoothTransfer will be done in Bug 1093084
        LazyLoader.load(['js/bluetooth_transfer.js', 'js/bluetooth_v2.js'],
          function() {
            BluetoothTransfer.start();
            window.Bluetooth = new Bluetooth2();
            window.Bluetooth.start();
        });
      }
    }
  });
}());
